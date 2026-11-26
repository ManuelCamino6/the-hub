export const examples = {
  environment: `export HUB_URL="https://YOUR_HUB_URL"
export HUB_TOKEN="YOUR_CONNECTOR_TOKEN"
export INSTANCE_ID="YOUR_INSTANCE_UUID"
export VERSION="1"
export TABLE="YOUR_MODEL_NAME"`,

  model: `curl "$HUB_URL/api/docs/model"`,

  installations: `curl "$HUB_URL/api/instances" \\
  -H "Authorization: Bearer $HUB_TOKEN"`,

  configuration: `curl "$HUB_URL/api/instances/$INSTANCE_ID" \\
  -H "Authorization: Bearer $HUB_TOKEN"`,

  setup: `curl -X POST \\
  "$HUB_URL/api/instances/$INSTANCE_ID/setup" \\
  -H "Authorization: Bearer $HUB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{}'`,

  begin: `curl -X POST "$HUB_URL/api/batches/begin" \\
  -H "Authorization: Bearer $HUB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{\\"instance_id\\":\\"$INSTANCE_ID\\"}"`,

  create: `curl -X POST \\
  "$HUB_URL/api/models/$VERSION/$TABLE" \\
  -H "Authorization: Bearer $HUB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"batch_id\\": \\"$BATCH_ID\\",
    \\"payload\\": [{
      \\"ref_id\\": \\"external-001\\",
      \\"client_operation_id\\": \\"create-001\\",
      \\"name\\": \\"Example\\"
    }]
  }"`,

  update: `curl -X PUT \\
  "$HUB_URL/api/models/$VERSION/$TABLE" \\
  -H "Authorization: Bearer $HUB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"batch_id\\": \\"$BATCH_ID\\",
    \\"payload\\": [{
      \\"ref_id\\": \\"external-001\\",
      \\"client_operation_id\\": \\"update-001\\",
      \\"name\\": \\"Updated example\\"
    }]
  }"`,

  delete: `curl -X DELETE \\
  "$HUB_URL/api/models/$VERSION/$TABLE" \\
  -H "Authorization: Bearer $HUB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"batch_id\\": \\"$BATCH_ID\\",
    \\"payload\\": [{
      \\"ref_id\\": \\"external-001\\",
      \\"client_operation_id\\": \\"delete-001\\"
    }]
  }"`,

  list: `curl -G "$HUB_URL/api/models/$VERSION/$TABLE" \\
  -H "Authorization: Bearer $HUB_TOKEN" \\
  --data-urlencode "instance_id=$INSTANCE_ID" \\
  --data-urlencode "limit=50"`,

  commit: `curl -X POST \\
  "$HUB_URL/api/batches/$BATCH_ID/commit" \\
  -H "Authorization: Bearer $HUB_TOKEN"`,

  rollback: `curl -X POST \\
  "$HUB_URL/api/batches/$BATCH_ID/rollback" \\
  -H "Authorization: Bearer $HUB_TOKEN"`,

  batchStatus: `curl "$HUB_URL/api/batches/$BATCH_ID" \\
  -H "Authorization: Bearer $HUB_TOKEN"`,

  pull: `curl -G "$HUB_URL/api/changes" \\
  -H "Authorization: Bearer $HUB_TOKEN" \\
  --data-urlencode "instance_id=$INSTANCE_ID" \\
  --data-urlencode "status=PENDING" \\
  --data-urlencode "limit=50"`,

  propagation: `curl "$HUB_URL/api/changes/$PROPAGATION_ID" \\
  -H "Authorization: Bearer $HUB_TOKEN"`,

  confirm: `curl -X POST "$HUB_URL/api/changes" \\
  -H "Authorization: Bearer $HUB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"confirmations\\": [{
      \\"id\\": \\"$PROPAGATION_ID\\",
      \\"status\\": \\"OK\\"
    }]
  }"`,

  confirmCreate: `{
  "confirmations": [
    {
      "id": "PROPAGATION_UUID",
      "status": "OK",
      "ref_id": "destination-001"
    }
  ]
}`,

  failed: `{
  "confirmations": [
    {
      "id": "PROPAGATION_UUID",
      "status": "FAILED",
      "comments": "External validation failed"
    }
  ]
}`,

  setting: `curl -G "$HUB_URL/api/changes" \\
  -H "Authorization: Bearer $HUB_TOKEN" \\
  --data-urlencode "type=SETTING" \\
  --data-urlencode "status=PENDING"`,

  error: `{
  "error": {
    "code": "BATCH_EXPIRED",
    "message": "BATCH_EXPIRED"
  }
}`,
} as const;

export const typescriptExample = `const baseUrl = process.env.HUB_URL!;
const token = process.env.HUB_TOKEN!;

type ApiResponse<T> = {
  data: T;
  next_cursor?: string | null;
};

async function hub<T>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<ApiResponse<T>> {
  const response = await fetch(
    baseUrl + path,
    {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: body === undefined
        ? undefined
        : JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    }
  );

  if (!response.ok) {
    throw new Error(
      "Hub HTTP " + response.status
    );
  }

  return response.json();
}

async function createRecord(
  instanceId: string,
  version: number,
  table: string,
  refId: string,
  fields: Record<string, unknown>,
  operationId: string
) {
  const { data: batch } = await hub<{
    id: string;
  }>(
    "/api/batches/begin",
    "POST",
    { instance_id: instanceId }
  );

  // Persist batch.id before sending changes.
  console.log("Batch:", batch.id);

  await hub(
    "/api/models/" + version + "/" + table,
    "POST",
    {
      batch_id: batch.id,
      payload: [{
        ...fields,
        ref_id: refId,
        client_operation_id: operationId
      }]
    }
  );

  return hub(
    "/api/batches/" + batch.id + "/commit",
    "POST"
  );
}`;

export const protocolStates = {
  batch: [
    "OPEN",
    "COMMITTED",
    "FAILED",
    "DISCARDED",
    "EXPIRED",
  ],

  propagation: [
    "PENDING",
    "FAILED",
    "OK",
    "EXPIRED",
  ],

  instance: [
    "OK",
    "INCOMPLETE",
    "UNAUTHORIZED",
  ],

  operation: [
    "ACTIVE",
    "PAUSED",
  ],

  connector: [
    "IN_DEVELOPMENT",
    "AVAILABLE",
    "DEPRECATED",
  ],
} as const;