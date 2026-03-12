import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: Database;
const DB_PATH = path.join(__dirname, '..', '..', 'geoaslan.db');

export async function initDatabase(): Promise<Database> {
    const SQL = await initSqlJs();

    // Eğer veritabanı dosyası varsa yükle, yoksa yeni oluştur
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Tabloları oluştur
    createTables(db);

    // Veritabanını diske kaydet
    saveDatabase();

    return db;
}

function createTables(db: Database): void {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_games INTEGER DEFAULT 0,
      highest_score INTEGER DEFAULT 0
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      map_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      current_round INTEGER DEFAULT 1,
      total_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      locations TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      actual_lat REAL NOT NULL,
      actual_lng REAL NOT NULL,
      guess_lat REAL,
      guess_lng REAL,
      distance_km REAL,
      score INTEGER,
      guessed INTEGER DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games(id)
    )
  `);
}

export function saveDatabase(): void {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

export function getDatabase(): Database {
    if (!db) {
        throw new Error('Veritabanı henüz başlatılmadı. initDatabase() çağrılmalı.');
    }
    return db;
}
