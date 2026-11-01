import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));

export function renderDeployment(
  env,
  outputDirectory = join(directory, '.runtime'),
) {
  const required = [
    'AZURE_LOCATION',
    'MANAGED_ENVIRONMENT_ID',
    'PULL_IDENTITY_ID',
    'ACR_SERVER',
    'BACKEND_IMAGE',
    'FRONTEND_IMAGE',
    'FRONTEND_ORIGIN',
    'MONGO_PROD',
    'SECRET_TOKEN',
  ];
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length)
    throw new Error(`Missing settings: ${missing.join(', ')}`);
  let database;
  let frontend;
  try {
    database = new URL(env.MONGO_PROD);
    frontend = new URL(env.FRONTEND_ORIGIN);
  } catch {
    throw new Error('Invalid MongoDB URI or frontend origin');
  }
  if (
    !['mongodb:', 'mongodb+srv:'].includes(database.protocol) ||
    database.pathname !== '/insu-demo'
  ) {
    throw new Error('Deployment must target the isolated insu-demo database');
  }
  if (
    frontend.protocol !== 'https:' ||
    frontend.origin !== env.FRONTEND_ORIGIN
  ) {
    throw new Error(
      'FRONTEND_ORIGIN must be an exact HTTPS origin without a path',
    );
  }
  if (env.SECRET_TOKEN.length < 32)
    throw new Error('SECRET_TOKEN must contain at least 32 characters');

  const identity = {
    type: 'UserAssigned',
    userAssignedIdentities: { [env.PULL_IDENTITY_ID]: {} },
  };
  const registries = [
    { server: env.ACR_SERVER, identity: env.PULL_IDENTITY_ID },
  ];
  const resources = { cpu: 0.25, memory: '0.5Gi' };
  const databaseSecret = { name: 'mongo-prod', value: env.MONGO_PROD };
  const databaseEnv = [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'MONGO_PROD', secretRef: 'mongo-prod' },
  ];
  const aiConfigured = Boolean(env.OPENROUTER_API_KEY && env.OPENROUTER_MODEL);
  const aiEnv = aiConfigured
    ? [
        { name: 'OPENROUTER_API_KEY', secretRef: 'openrouter-key' },
        { name: 'OPENROUTER_MODEL', value: env.OPENROUTER_MODEL },
      ]
    : [];
  const probe = (type, path, port) => ({
    type,
    httpGet: { path, port, scheme: 'HTTP' },
    initialDelaySeconds: 5,
    periodSeconds: type === 'Liveness' ? 30 : 10,
    timeoutSeconds: 5,
    failureThreshold: type === 'Startup' ? 30 : 3,
  });
  const scale = {
    minReplicas: 1,
    maxReplicas: 1,
    rules: [{ name: 'http', http: { metadata: { concurrentRequests: '10' } } }],
  };
  const app = (name, container, port, secrets = [], volumes = []) => ({
    location: env.AZURE_LOCATION,
    name,
    type: 'Microsoft.App/containerApps',
    identity,
    properties: {
      managedEnvironmentId: env.MANAGED_ENVIRONMENT_ID,
      workloadProfileName: 'Consumption',
      configuration: {
        activeRevisionsMode: 'Single',
        registries,
        secrets,
        ingress: {
          external: true,
          allowInsecure: false,
          targetPort: port,
          transport: 'auto',
        },
      },
      template: { containers: [container], volumes, scale },
    },
  });
  const backend = app(
    'insu-api',
    {
      name: 'api',
      image: env.BACKEND_IMAGE,
      resources,
      env: [
        ...databaseEnv,
        ...aiEnv,
        { name: 'PORT_API', value: '3007' },
        { name: 'SECRET_TOKEN', secretRef: 'jwt-secret' },
        { name: 'ALLOWED_ORIGINS', value: env.FRONTEND_ORIGIN },
      ],
      volumeMounts: [{ volumeName: 'uploads', mountPath: '/app/uploads' }],
      probes: [
        probe('Startup', '/health/ready', 3007),
        probe('Readiness', '/health/ready', 3007),
        probe('Liveness', '/health/live', 3007),
      ],
    },
    3007,
    [
      databaseSecret,
      { name: 'jwt-secret', value: env.SECRET_TOKEN },
      ...(aiConfigured
        ? [{ name: 'openrouter-key', value: env.OPENROUTER_API_KEY }]
        : []),
    ],
    [
      {
        name: 'uploads',
        storageType: 'AzureFile',
        storageName: 'insu-uploads',
      },
    ],
  );
  const frontendApp = app(
    'insu-web',
    {
      name: 'web',
      image: env.FRONTEND_IMAGE,
      resources,
      env: [
        { name: 'NODE_ENV', value: 'production' },
        { name: 'PORT', value: '3000' },
      ],
      probes: [
        probe('Startup', '/', 3000),
        probe('Readiness', '/', 3000),
        probe('Liveness', '/', 3000),
      ],
    },
    3000,
  );
  const job = (name, trigger, command, args = []) => ({
    location: env.AZURE_LOCATION,
    name,
    type: 'Microsoft.App/jobs',
    identity,
    properties: {
      environmentId: env.MANAGED_ENVIRONMENT_ID,
      workloadProfileName: 'Consumption',
      configuration: {
        triggerType: trigger,
        replicaTimeout: 300,
        replicaRetryLimit: 0,
        registries,
        secrets: [databaseSecret],
        ...(trigger === 'Schedule'
          ? {
              scheduleTriggerConfig: {
                cronExpression: '0 17 * * *',
                parallelism: 1,
                replicaCompletionCount: 1,
              },
            }
          : {
              manualTriggerConfig: {
                parallelism: 1,
                replicaCompletionCount: 1,
              },
            }),
      },
      template: {
        containers: [
          {
            name: 'job',
            image: env.BACKEND_IMAGE,
            resources,
            command: ['node', command],
            args,
            env: databaseEnv,
          },
        ],
      },
    },
  });
  const manifests = {
    'backend.yaml': backend,
    'frontend.yaml': frontendApp,
    'batch-job.yaml': job(
      'insu-batch',
      'Schedule',
      'dist/apps/insu-batch/run-once.js',
    ),
    'migration-job.yaml': job(
      'insu-migration',
      'Manual',
      'dist/apps/insu-api/migrate-policy-purchase-open.js',
      ['--check'],
    ),
  };
  mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
  chmodSync(outputDirectory, 0o700);
  for (const [name, manifest] of Object.entries(manifests)) {
    const path = join(outputDirectory, name);
    // JSON is valid YAML; serialization preserves credentials without interpolation.
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, {
      mode: 0o600,
    });
    chmodSync(path, 0o600);
  }
  return Object.keys(manifests);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const files = renderDeployment(process.env);
    console.log(
      `Wrote ${files.length} private manifests to deploy/azure/.runtime`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
