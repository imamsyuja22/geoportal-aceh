const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: false
})

const db = {

  prepare(sql) {

    return {

      async get(...params) {

        const result =
          await pool.query(
            sql,
            params
          )

        return (
          result.rows[0] ||
          undefined
        )

      },

      async all(...params) {

        const result =
          await pool.query(
            sql,
            params
          )

        return result.rows

      },

      async run(...params) {

        const result =
          await pool.query(
            sql,
            params
          )

        return {

          changes:
            result.rowCount,

          lastInsertRowid:
            result.rows[0]?.id ||
            null

        }

      }

    }

  },

  async exec(sql) {

    return pool.query(sql)

  }

}

async function testDatabase() {

  try {

    const result =
      await pool.query(
        'SELECT NOW() AS now'
      )

    console.log(
      'Database Supabase PostgreSQL berhasil terhubung.'
    )

    console.log(
      'Database time:',
      result.rows[0].now
    )

  } catch (error) {

    console.error(
      'DATABASE CONNECTION ERROR:',
      error.message
    )

    console.error(
      'DATABASE CONNECTION DETAIL:',
      error
    )

    process.exit(1)

  }

}


async function initializeDatabase() {

  await pool.query(`

    CREATE TABLE IF NOT EXISTS users (

      id SERIAL PRIMARY KEY,

      username TEXT NOT NULL UNIQUE,

      email TEXT NOT NULL UNIQUE,

      password TEXT NOT NULL,

      role TEXT NOT NULL DEFAULT 'operator',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT users_role_check

      CHECK (
        role IN (
          'admin',
          'operator'
        )
      )

    )

  `)

  await pool.query(`

    CREATE TABLE IF NOT EXISTS datasets (

      id SERIAL PRIMARY KEY,

      title TEXT NOT NULL,

      abstract TEXT,

      resource_type TEXT NOT NULL
      DEFAULT 'dataset',


      category TEXT,

      keywords TEXT,

      file_path TEXT,

      file_name TEXT,

      owner_id INTEGER NOT NULL,

      is_published INTEGER NOT NULL DEFAULT 0,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT datasets_owner_fk

      FOREIGN KEY (
        owner_id
      )

      REFERENCES users(id)

      ON DELETE CASCADE

    )

  `)

  await pool.query(`
    ALTER TABLE datasets
    ALTER COLUMN file_path DROP NOT NULL
  `)

  await pool.query(`
    ALTER TABLE datasets
    ALTER COLUMN file_name DROP NOT NULL
  `)

  await pool.query(`
    ALTER TABLE datasets
    ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'file'
  `)

  await pool.query(`
    ALTER TABLE datasets
    ADD COLUMN IF NOT EXISTS external_url TEXT
  `)

  await pool.query(`
    ALTER TABLE datasets
    ADD COLUMN IF NOT EXISTS extra_metadata TEXT
  `)

  await pool.query(`
    ALTER TABLE datasets
    ADD COLUMN IF NOT EXISTS files_json TEXT
  `)

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT
  `)

  await pool.query(`
    ALTER TABLE datasets
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT
  `)

  await pool.query(`
    ALTER TABLE datasets
    ADD COLUMN IF NOT EXISTS sub_type TEXT
  `)

  await pool.query(`
    ALTER TABLE datasets
    DROP CONSTRAINT IF EXISTS datasets_resource_type_check
  `)

  await pool.query(`
    ALTER TABLE datasets
    ADD CONSTRAINT datasets_resource_type_check
    CHECK (
      resource_type IN (
        'dataset',
        'dashboard',
        'application',
        'map',
        'document',
        'informasi'
      )
    )
  `)

  await pool.query(`
    ALTER TABLE datasets
    DROP CONSTRAINT IF EXISTS datasets_content_type_check
  `)

  await pool.query(`
    ALTER TABLE datasets
    ADD CONSTRAINT datasets_content_type_check
    CHECK (
      content_type IN (
        'file',
        'link',
        'both',
        'composite'
      )
    )
  `)

  await pool.query(`

    CREATE TABLE IF NOT EXISTS api_overrides (

      id SERIAL PRIMARY KEY,

      resource_type TEXT NOT NULL,

      external_id TEXT NOT NULL,

      is_hidden INTEGER NOT NULL DEFAULT 0,

      title_override TEXT,

      abstract_override TEXT,

      category_override TEXT,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT api_overrides_type_check

      CHECK (
        resource_type IN (
          'dataset',
          'geoapp',
          'map',
          'document'
        )
      ),

      CONSTRAINT api_overrides_unique

      UNIQUE (
        resource_type,
        external_id
      )

    )

  `)

  await pool.query(`
    ALTER TABLE api_overrides
    ADD COLUMN IF NOT EXISTS keywords_override TEXT
  `)

    await pool.query(`
    ALTER TABLE api_overrides
    ADD COLUMN IF NOT EXISTS extra_metadata_override TEXT
  `)

  await pool.query(`
    ALTER TABLE api_overrides
    ADD COLUMN IF NOT EXISTS attribute_data_override TEXT
  `)

  await pool.query(`
    ALTER TABLE api_overrides
    ADD COLUMN IF NOT EXISTS map_layers_override TEXT
  `)

  await pool.query(`
    ALTER TABLE api_overrides
    DROP CONSTRAINT IF EXISTS api_overrides_type_check
  `)

  await pool.query(`
    ALTER TABLE api_overrides
    ADD CONSTRAINT api_overrides_type_check
    CHECK (
      resource_type IN (
        'dataset',
        'geoapp',
        'map',
        'document'
      )
    )
  `)

  await pool.query(`

    CREATE TABLE IF NOT EXISTS agency_profiles (

      id SERIAL PRIMARY KEY,

      username TEXT NOT NULL UNIQUE,

      description TEXT,

      website_url TEXT,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    )

  `)

  console.log(
    'Tabel users, datasets, api_overrides, dan agency_profiles siap.'
  )

}

async function initialize() {

  await testDatabase()

  await initializeDatabase()

}

initialize()

  .catch(error => {

    console.error(
      'DATABASE INITIALIZATION ERROR:',
      error
    )

    process.exit(1)

  })

module.exports = db