import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { renderDeployment } from './render.mjs';

const settings = {
  AZURE_LOCATION: 'koreacentral',
  MANAGED_ENVIRONMENT_ID:
    '/subscriptions/test/resourceGroups/demo/providers/Microsoft.App/managedEnvironments/demo',
  PULL_IDENTITY_ID:
    '/subscriptions/test/resourceGroups/demo/providers/Microsoft.ManagedIdentity/userAssignedIdentities/pull',
  ACR_SERVER: 'example.azurecr.io',
  BACKEND_IMAGE: 'example.azurecr.io/insu-api:test',
  FRONTEND_IMAGE: 'example.azurecr.io/insu-web:test',
  FRONTEND_ORIGIN: 'https://insu-web.example.azurecontainerapps.io',
  MONGO_PROD: 'mongodb://localhost/insu-demo',
  SECRET_TOKEN: 'test-signing-key-with-quotes-"-and-more-than-32-characters',
};

test('renders private images, persistent uploads and finite jobs without exposing the signing key in container env', () => {
  const output = mkdtempSync(join(tmpdir(), 'insu-azure-render-'));
  try {
    renderDeployment(settings, output);
    const backend = JSON.parse(
      readFileSync(join(output, 'backend.yaml'), 'utf8'),
    );
    const batch = JSON.parse(
      readFileSync(join(output, 'batch-job.yaml'), 'utf8'),
    );
    const migration = JSON.parse(
      readFileSync(join(output, 'migration-job.yaml'), 'utf8'),
    );
    assert.equal(
      backend.properties.configuration.secrets.find(
        (item) => item.name === 'jwt-secret',
      ).value,
      settings.SECRET_TOKEN,
    );
    const jwt = backend.properties.template.containers[0].env.find(
      (item) => item.name === 'SECRET_TOKEN',
    );
    assert.equal(jwt.secretRef, 'jwt-secret');
    assert.equal(jwt.value, undefined);
    assert.equal(
      backend.properties.configuration.registries[0].identity,
      settings.PULL_IDENTITY_ID,
    );
    assert.equal(
      backend.properties.template.volumes[0].storageType,
      'AzureFile',
    );
    assert.equal(backend.properties.template.scale.maxReplicas, 1);
    assert.equal(
      batch.properties.configuration.scheduleTriggerConfig.cronExpression,
      '0 17 * * *',
    );
    assert.deepEqual(batch.properties.template.containers[0].command, [
      'node',
      'dist/apps/insu-batch/run-once.js',
    ]);
    assert.deepEqual(migration.properties.template.containers[0].args, [
      '--check',
    ]);
    assert.equal(statSync(join(output, 'backend.yaml')).mode & 0o777, 0o600);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('refuses a database outside the isolated demo target', () => {
  assert.throws(
    () =>
      renderDeployment(
        { ...settings, MONGO_PROD: 'mongodb://localhost/customer-data' },
        '/unused',
      ),
    /insu-demo/,
  );
});

test('keeps optional AI credentials in a backend secret and out of jobs', () => {
  const output = mkdtempSync(join(tmpdir(), 'insu-azure-ai-'));
  try {
    renderDeployment(
      {
        ...settings,
        OPENROUTER_API_KEY: 'test-only-ai-key',
        OPENROUTER_MODEL: 'test/model:free',
      },
      output,
    );
    const backend = JSON.parse(
      readFileSync(join(output, 'backend.yaml'), 'utf8'),
    );
    const ai = backend.properties.template.containers[0].env.find(
      (item) => item.name === 'OPENROUTER_API_KEY',
    );
    assert.equal(ai?.secretRef, 'openrouter-key');
    assert.equal(ai?.value, undefined);
    assert.equal(
      backend.properties.configuration.secrets.find(
        (item) => item.name === 'openrouter-key',
      )?.value,
      'test-only-ai-key',
    );
    for (const name of [
      'frontend.yaml',
      'batch-job.yaml',
      'migration-job.yaml',
    ]) {
      assert.equal(
        readFileSync(join(output, name), 'utf8').includes('test-only-ai-key'),
        false,
      );
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('refuses incomplete secrets and non-HTTPS frontend origins before writing files', () => {
  assert.throws(
    () => renderDeployment({ ...settings, SECRET_TOKEN: 'short' }, '/unused'),
    /32/,
  );
  assert.throws(
    () =>
      renderDeployment(
        { ...settings, FRONTEND_ORIGIN: 'http://localhost:3000' },
        '/unused',
      ),
    /HTTPS/,
  );
});
