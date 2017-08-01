import { Pool } from 'pg';
import { Configuration } from '../config';

const pool: Pool = new Pool(Configuration.dbConnect);

export function query (text, params) { console.log(text + ", " + params); return pool.query(text, params); }