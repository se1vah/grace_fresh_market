import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD ?? '';
const DB_NAME = process.env.DB_NAME || 'grace_fresh_market_local';

let pool: mysql.Pool | null = null;
let initialized = false;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function initShopDb(): Promise<void> {
  if (initialized) return;

  try {
    // Ensure Database exists
    const tempConnection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await tempConnection.end();

    const activePool = getPool();

    // Ensure shop_user table exists
    const createShopUserTableQuery = `
      CREATE TABLE IF NOT EXISTS shop_user (
          id CHAR(36) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          isSuperAdmin BOOLEAN NOT NULL DEFAULT FALSE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    await activePool.query(createShopUserTableQuery);

    // Ensure categories table exists
    const createCategoriesTableQuery = `
      CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category_name VARCHAR(255) NOT NULL,
          image VARCHAR(500) NOT NULL,
          category_type ENUM('gram', 'quantity') NOT NULL DEFAULT 'gram',
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_category_name (category_name),
          INDEX idx_status (status)
      );
    `;

    await activePool.query(createCategoriesTableQuery);

    // Migration for existing categories table without category_type column
    try {
      await activePool.query(`ALTER TABLE categories ADD COLUMN category_type ENUM('gram', 'quantity') NOT NULL DEFAULT 'gram';`);
    } catch (err) {
      // Column may already exist, ignore error
    }

    // Ensure subcategories table exists
    const createSubCategoriesTableQuery = `
      CREATE TABLE IF NOT EXISTS subcategories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category_id INT NOT NULL,
          subcategory_name VARCHAR(255) NOT NULL,
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          stock INT NULL DEFAULT NULL,
          offer DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_category_id (category_id),
          INDEX idx_subcategory_name (subcategory_name),
          INDEX idx_status (status),
          CONSTRAINT fk_subcategories_category
              FOREIGN KEY (category_id) REFERENCES categories(id)
              ON DELETE RESTRICT
      );
    `;

    await activePool.query(createSubCategoriesTableQuery);

    try {
      await activePool.query(`ALTER TABLE subcategories ADD COLUMN stock INT NULL DEFAULT NULL;`);
    } catch (err) {
      // Column may already exist, ignore error
    }

    try {
      await activePool.query(`ALTER TABLE subcategories ADD COLUMN offer DECIMAL(5, 2) NOT NULL DEFAULT 0.00;`);
    } catch (err) {
      // Column may already exist, ignore error
    }

    // Ensure subcategory_images table exists
    const createSubCategoryImagesTableQuery = `
      CREATE TABLE IF NOT EXISTS subcategory_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          subcategory_id INT NOT NULL,
          image_url VARCHAR(500) NOT NULL,
          is_primary TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_subcategory_id (subcategory_id),
          CONSTRAINT fk_subcategory_images_subcategory
              FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
              ON DELETE CASCADE
      );
    `;

    await activePool.query(createSubCategoryImagesTableQuery);

    // Migration logic: populate subcategory_images from subcategories table if subcategory_images is empty
    try {
      const [imgRows] = await activePool.query<any[]>('SELECT COUNT(*) as count FROM subcategory_images');
      if (imgRows && imgRows[0] && imgRows[0].count === 0) {
        // Attempt to select image and images columns if they still exist in subcategories
        try {
          const [subs] = await activePool.query<any[]>('SELECT id, image, images FROM subcategories');
          if (Array.isArray(subs)) {
            for (const sub of subs) {
              let urls: string[] = [];
              if (sub.images) {
                try {
                  const parsed = JSON.parse(sub.images);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    urls = parsed;
                  }
                } catch (e) { }
              }
              if (urls.length === 0 && sub.image) {
                urls = [sub.image];
              }
              for (let i = 0; i < urls.length; i++) {
                await activePool.query(
                  'INSERT INTO subcategory_images (subcategory_id, image_url, is_primary) VALUES (?, ?, ?)',
                  [sub.id, urls[i], i === 0 ? 1 : 0]
                );
              }
            }
          }
        } catch (subErr) {
          // Columns image or images may already be dropped
        }
      }
    } catch (err) {
      console.error('Error migrating subcategory_images:', err);
    }

    // Safely drop deprecated image and images columns from subcategories table
    try {
      await activePool.query(`ALTER TABLE subcategories DROP COLUMN images;`);
    } catch (err) {
      // Column may already be dropped, ignore error
    }

    try {
      await activePool.query(`ALTER TABLE subcategories DROP COLUMN image;`);
    } catch (err) {
      // Column may already be dropped, ignore error
    }

    // Ensure cms_pages table exists
    const createCmsPagesTableQuery = `
      CREATE TABLE IF NOT EXISTS cms_pages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          page_name VARCHAR(150) NOT NULL,
          slug VARCHAR(200) NOT NULL UNIQUE,
          page_title VARCHAR(255) NOT NULL,
          meta_description TEXT NOT NULL,
          content LONGTEXT NOT NULL,
          status ENUM('Active', 'Inactive') DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_slug (slug),
          INDEX idx_status (status)
      );
    `;

    await activePool.query(createCmsPagesTableQuery);

    // Ensure users table exists
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          fullName VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          phoneNumber VARCHAR(50) NOT NULL DEFAULT '',
          profileImage VARCHAR(500) NULL DEFAULT '',
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_email (email)
      );
    `;

    await activePool.query(createUsersTableQuery);

    // Migration for existing tables without phoneNumber or profileImage column
    try {
      await activePool.query(`ALTER TABLE users ADD COLUMN phoneNumber VARCHAR(50) NOT NULL DEFAULT '';`);
    } catch (err) {
      // Column may already exist, ignore error
    }

    try {
      await activePool.query(`ALTER TABLE users ADD COLUMN profileImage VARCHAR(500) NULL DEFAULT '';`);
    } catch (err) {
      // Column may already exist, ignore error
    }

    // Ensure UserLogin table exists
    const createUserLoginTableQuery = `
      CREATE TABLE IF NOT EXISTS userLogin (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          CONSTRAINT fk_user_login_user
              FOREIGN KEY (user_id) REFERENCES users(id)
              ON DELETE CASCADE
      );
    `;

    await activePool.query(createUserLoginTableQuery);

    // Ensure cart table exists
    const createCartTableQuery = `
      CREATE TABLE IF NOT EXISTS cart (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          subcategory_id INT NOT NULL,
          quantity FLOAT NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_cart_user (user_id),
          INDEX idx_cart_subcategory (subcategory_id),
          UNIQUE KEY uk_user_subcategory (user_id, subcategory_id),
          CONSTRAINT fk_cart_user
              FOREIGN KEY (user_id) REFERENCES users(id)
              ON DELETE CASCADE,
          CONSTRAINT fk_cart_subcategory
              FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
              ON DELETE CASCADE
      );
    `;

    await activePool.query(createCartTableQuery);

    // Migration for existing cart table to modify quantity column type to FLOAT
    try {
      await activePool.query(`ALTER TABLE cart MODIFY COLUMN quantity FLOAT NOT NULL DEFAULT 1;`);
    } catch (err) {
      // Column may already be FLOAT, ignore error
    }

    // Ensure user_addresses table exists
    const createUserAddressesTableQuery = `
      CREATE TABLE IF NOT EXISTS user_addresses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          building_name VARCHAR(255) NOT NULL,
          street_name VARCHAR(255) NOT NULL,
          city VARCHAR(100) NOT NULL,
          state VARCHAR(100) NULL DEFAULT '',
          pincode VARCHAR(20) NOT NULL,
          address_type ENUM('Home', 'Work', 'Other') NOT NULL DEFAULT 'Home',
          is_default TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_address_user (user_id),
          INDEX idx_address_type (address_type),
          CONSTRAINT fk_address_user
              FOREIGN KEY (user_id) REFERENCES users(id)
              ON DELETE CASCADE
      );
    `;

    await activePool.query(createUserAddressesTableQuery);

    // Migration for existing user_addresses table
    try {
      await activePool.query(`ALTER TABLE user_addresses ADD COLUMN state VARCHAR(100) NULL DEFAULT '';`);
    } catch (err) {
      // Column may already exist, ignore error
    }

    try {
      await activePool.query(`ALTER TABLE user_addresses DROP COLUMN landmark;`);
    } catch (err) {
      // Ignore if unable to modify enum
    }

    // Ensure payment methods are persisted rather than hard-coded by checkout APIs.
    const createPaymentMethodTableQuery = `
      CREATE TABLE IF NOT EXISTS PaymentMethod (
          id INT AUTO_INCREMENT PRIMARY KEY,
          paymentType VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_payment_method_type (paymentType)
      );
    `;

    await activePool.query(createPaymentMethodTableQuery);

    // Seed COD once. The unique payment type also protects against duplicate data
    // when more than one process initializes the database at the same time.
    await activePool.query(
      `INSERT INTO PaymentMethod (paymentType, description)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE paymentType = VALUES(paymentType)`,
      [
        'COD',
        "Pay when your fresh produce arrives at your door. We accept exact cash or card via our driver's terminal.",
      ]
    );

    // Ensure app_settings table exists
    const createAppSettingsTableQuery = `
      CREATE TABLE IF NOT EXISTS app_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL DEFAULT '',
          phone_number VARCHAR(50) NOT NULL DEFAULT '',
          delivery_fee DECIMAL(10,2) NULL DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    await activePool.query(createAppSettingsTableQuery);

    // Migration for app_settings tables created before delivery_fee was added.
    try {
      await activePool.query(
        'ALTER TABLE app_settings ADD COLUMN delivery_fee DECIMAL(10,2) NULL DEFAULT NULL;'
      );
    } catch {
      // The column already exists on newer installations.
    }

    // Seed default initial app_settings if empty
    try {
      const [settingRows] = await activePool.query<any[]>('SELECT COUNT(*) as count FROM app_settings');
      if (settingRows && settingRows[0] && settingRows[0].count === 0) {
        await activePool.query(
          'INSERT INTO app_settings (email, phone_number) VALUES (?, ?)',
          ['info@gracefreshmarket.com', '+1 (800) 555-0199']
        );
      }
    } catch (err) {
      console.error('Error seeding app_settings:', err);
    }

    initialized = true;
  } catch (error) {
    console.error('Failed to initialize shop database:', error);
    throw error;
  }
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  await initShopDb();
  const activePool = getPool();
  const [rows] = await activePool.query(sql, params);
  return rows as T;
}
