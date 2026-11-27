import postgres from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const projectId = randomUUID();
const username = `hub.${projectId}`;
const password = randomBytes(32).toString("base64url");

assert(process.env.DATABASE_URL);
assert(process.env.BI_HOST);

const mode = process.env.BI_CONNECTION_MODE ?? "session";
const projectRef = process.env.BI_POOLER_PROJECT_REF;

if (mode === "session") {
  assert(projectRef);
}

const connectionUsername =
  mode === "session"
    ? `${username}.${projectRef}`
    : username;

const admin = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: "require",
  connect_timeout: 10,
});

let client;
let created = false;

try {
  await admin.unsafe(`
    create role "${username}"
    login
    inherit
    nosuperuser
    nocreatedb
    nocreaterole
    noreplication
    nobypassrls
    connection limit 2
    password '${password}'
  `);

  created = true;

  await admin.unsafe(`
    grant hub_bi_reader
    to "${username}"
    with inherit true, set false
  `);

  client = postgres({
    host: process.env.BI_HOST,
    port: Number(process.env.BI_PORT ?? 5432),
    database: process.env.BI_DATABASE ?? "postgres",
    username: connectionUsername,
    password,
    ssl: "require",
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });

  const [identity] = await client`
    select
      current_user,
      session_user
  `;

  console.log("Identity:", identity);

  assert.equal(identity.session_user, username);

  const [result] = await client`
    select count(*)::integer as total
    from analytics.stores
  `;

  assert.equal(result.total, 0);

  console.log("PASS: analytics view accessible.");
  console.log("PASS: unregistered identity sees zero rows.");

  await assert.rejects(
    async () => {
      await client`select * from data.stores`;
    },
    (error) => error.code === "42501"
  );

  console.log("PASS: direct data access denied.");

  await assert.rejects(
    async () => {
      await client`select * from data.stores_ref`;
    },
    (error) => error.code === "42501"
  );

  console.log("PASS: reference access denied.");

} finally {
  try {
    if (client) {
      await client.end({ timeout: 5 });
    }

    if (created) {
      await admin.unsafe(`
        alter role "${username}"
        nologin password null
      `);

      await admin`
        select pg_terminate_backend(pid)
        from pg_stat_activity
        where usename = ${username}
          and pid <> pg_backend_pid()
      `;

      await admin.unsafe(`
        drop role "${username}"
      `);

      console.log("Temporary role removed.");
    }
  } finally {
    await admin.end({ timeout: 5 });
  }
}