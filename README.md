# Personal Budget Calculator

A private, single-household budgeting tool for tracking monthly income, fixed and variable expenses, savings, and per-partner cash flow to a shared bank account. Built with **vanilla JavaScript + CSS + HTML** on the frontend and **PHP 8 + MariaDB** on the backend.

> **Note**: This project was refactored from React/TypeScript to vanilla JavaScript to support hosting on platforms like Infomaniak that don't support Node.js/npm.

## Features

### Core Functionality
- ✅ **Income Tracking**: Track multiple income sources per partner
- ✅ **Expense Management**: Categorize expenses as fixed or variable
- ✅ **Savings Tracking**: Monitor savings goals
- ✅ **Partner Breakdown**: Calculate per-partner contributions and allowances
- ✅ **Inline Editing**: Click-to-edit amounts with auto-save

### Advanced Features
- ✅ **History Tracking**: 3 months of change history with automatic cleanup
- ✅ **Undo Functionality**: Undo last 10 actions (create, update, delete)
- ✅ **Real-time Sync**: Server-Sent Events (SSE) with polling fallback
- ✅ **Configurable Partners**: 1-2 partners with customizable names
- ✅ **PWA Support**: Installable as a Progressive Web App

### Security
- ✅ **Authentication**: Session-based login with PHP sessions
- ✅ **Data Validation**: Input validation on both client and server
- ✅ **Secure Passwords**: Bcrypt password hashing
- ✅ **CSRF Protection**: Session-based authentication

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| Backend | PHP 8.0+ |
| Database | MariaDB 10.5+ / MySQL 8.0+ |
| PWA | Service Worker API |

## Project Structure

```
Public/
├── .htaccess                          # Apache routing configuration
├── index.php                        # Frontend entry point (serves HTML)
├── manifest.json                    # PWA manifest
├── sw.js                            # Service worker
├── config/
│   └── database.php                 # Database connection (PDO)
├── install/
│   └── setup.php                     # Database schema setup
├── api/                             # PHP API endpoints
│   ├── config.php                   # API configuration (CORS, sessions)
│   ├── login.php                    # User login endpoint
│   ├── logout.php                   # User logout endpoint
│   ├── register.php                 # User registration endpoint
│   ├── user.php                     # Get current user info
│   ├── budget_items.php             # Budget item CRUD operations
│   ├── calculations.php             # Budget calculations
│   ├── history.php                  # History retrieval
│   ├── undo.php                     # Undo last action
│   ├── partners.php                 # Partner management
│   └── sync_events.php              # Server-Sent Events for real-time sync
├── assets/
│   ├── css/
│   │   └── styles.css               # Main stylesheet
│   └── icons/                       # PWA icons (72x72 to 512x512)
└── js/                              # Vanilla JavaScript frontend
    ├── app.js                       # Main application entry point
    ├── types.js                     # JSDoc type definitions
    ├── context/
    │   ├── AuthContext.js           # Authentication state management
    │   └── BudgetContext.js         # Budget data state management
    ├── pages/
    │   ├── Login.js                 # Login & registration pages
    │   └── BudgetDashboard.js       # Main dashboard
    └── utils/
        ├── api.js                   # API client (fetch-based)
        └── router.js                # Client-side router
```

## Database Schema

### Tables

#### `users`
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `partners`
```sql
CREATE TABLE partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(80) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (user_id)
);
```

#### `budget_items`
```sql
CREATE TABLE budget_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(80) NOT NULL,
    category ENUM('income', 'fixed_expense', 'variable_expense', 'savings') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (category)
);
```

#### `budget_history`
```sql
CREATE TABLE budget_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    old_amount DECIMAL(10, 2),
    new_amount DECIMAL(10, 2),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES budget_items(id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (item_id),
    INDEX (changed_at)
);
```

#### `undo_stack`
```sql
CREATE TABLE undo_stack (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action ENUM('insert', 'update', 'delete') NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    old_data JSON,
    new_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (created_at)
);
```

#### `settings`
```sql
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    key_name VARCHAR(80) NOT NULL,
    key_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, key_name),
    INDEX (user_id)
);
```

### Triggers

#### Auto-cleanup History (3 months)
```sql
CREATE TRIGGER cleanup_old_history
AFTER INSERT ON budget_history
FOR EACH ROW
BEGIN
    DELETE FROM budget_history 
    WHERE user_id = NEW.user_id 
    AND changed_at < DATE_SUB(NOW(), INTERVAL 3 MONTH);
END
```

#### Limit Undo Stack (10 entries)
```sql
CREATE TRIGGER limit_undo_stack
AFTER INSERT ON undo_stack
FOR EACH ROW
BEGIN
    DELETE FROM undo_stack 
    WHERE user_id = NEW.user_id 
    AND id NOT IN (
        SELECT id FROM (
            SELECT id FROM undo_stack 
            WHERE user_id = NEW.user_id 
            ORDER BY created_at DESC 
            LIMIT 10
        ) AS latest_10
    );
END
```

#### Default Settings for New Users
```sql
CREATE TRIGGER insert_default_settings
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO settings (user_id, key_name, key_value) VALUES 
    (NEW.id, 'max_partners', '2'),
    (NEW.id, 'currency', '€'),
    (NEW.id, 'history_retention_days', '90');
END
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login.php` | Login with email and password |
| POST | `/api/logout.php` | Logout current user |
| POST | `/api/register.php` | Register new user (admin only) |
| GET | `/api/user.php` | Get current user information |

### Budget Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budget_items.php` | Get all budget items |
| GET | `/api/budget_items.php?category=X` | Get items by category |
| POST | `/api/budget_items.php` | Create new budget item |
| PUT | `/api/budget_items.php?id=X` | Update budget item |
| DELETE | `/api/budget_items.php?id=X` | Delete budget item |

### Calculations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calculations.php` | Get all calculations and partner breakdown |

### Partners
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/partners.php` | Get all partners |
| POST | `/api/partners.php` | Add new partner |
| PUT | `/api/partners.php?id=X` | Update partner name |
| DELETE | `/api/partners.php?id=X` | Delete partner |

### History & Undo
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history.php` | Get user history |
| GET | `/api/history.php?itemId=X` | Get item-specific history |
| POST | `/api/undo.php` | Undo last action |

### Real-time Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync_events.php` | Server-Sent Events stream |

## Calculations

### Formulas
```
totalIncome           = Σ income.amount
totalFixedExpenses    = Σ fixed_expense.amount
totalVariableExpenses = Σ variable_expense.amount
totalSavings          = savings.amount
remainingBudget       = totalIncome − totalFixedExpenses − totalVariableExpenses
savingsPerPartner     = totalSavings / 2
personalAllowance     = (remainingBudget − totalSavings) / 2

alexxxTotalIncome     = Alexxx's Income + Meal Vouchers
majaTotalIncome       = Maja's Income
alexxxBankContribution = alexxxTotalIncome − savingsPerPartner − personalAllowance − mealVouchers
majaBankContribution   = majaTotalIncome − savingsPerPartner − personalAllowance
```

### Partner Name Matching
The system dynamically matches income items to partners by checking if the partner's name appears in the income item name. For example:
- Income item "Alexxx's Income" → matched to partner "Alexxx"
- Income item "Maja's Income" → matched to partner "Maja"
- Income item "Meal Vouchers" → matched to partner "Alexxx" (special case)

## Deployment

### Prerequisites

- **PHP**: 8.0 or higher
- **MariaDB/MySQL**: 10.5+ or 8.0+
- **Web Server**: Apache or Nginx
- **No Node.js required** - Frontend uses vanilla JavaScript

### Step 1: Clone the Repository

```bash
git clone https://github.com/AlexxxJeddr/budget.git
cd budget
```

### Step 2: Set Up Database

#### Create Database
```bash
mysql -u root -p -e "CREATE DATABASE budget_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### Run Setup Script
Edit `Public/config/database.php` with your database credentials:
```php
$host = 'localhost';
$dbname = 'budget_app';
$user = 'your_username';
$password = 'your_password';
```

Then run the setup script by visiting:
```
http://yourdomain.com/install/setup.php
```

This will create all tables, triggers, and insert default settings.

### Step 3: Configure Web Server

#### Apache (Recommended)

The `.htaccess` file is already configured. Just ensure:
- `mod_rewrite` is enabled
- `AllowOverride All` is set for your document root

```apache
<VirtualHost *:80>
    ServerName budget.yourdomain.com
    DocumentRoot /path/to/budget/Public
    
    <Directory /path/to/budget/Public>
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

#### Nginx

```nginx
server {
    listen 80;
    server_name budget.yourdomain.com;
    root /path/to/budget/Public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_param PATH_INFO $fastcgi_path_info;
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Step 4: Deploy to Infomaniak (or any PHP hosting)

#### Option A: FTP Upload
1. Upload the entire `Public` folder to your Infomaniak web hosting
2. Ensure the folder structure is preserved
3. Visit your domain to complete setup

#### Option B: SSH Upload
```bash
# Copy Public folder contents to your web root
scp -r Public/* user@your-infomaniak-server:/path/to/webroot/
```

#### Option C: Git Clone on Server
```bash
# On your Infomaniak server
cd /path/to/webroot
git clone https://github.com/AlexxxJeddr/budget.git .
# Copy Public contents to root
cp -r budget/Public/* .
rm -rf budget
```

### Step 5: Create First User

You can create the first user by:

1. **Using SQL** (recommended):
```bash
# Generate password hash (use PHP or online tool)
php -r "echo password_hash('your_password', PASSWORD_BCRYPT);"

# Insert user
mysql -u root -p budget_app -e "INSERT INTO users (email, password_hash) VALUES ('admin@example.com', '\$2y\$10\$...');"
```

2. **Using Registration Endpoint** (only works when no users exist):
```bash
curl -X POST http://yourdomain.com/api/register.php \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your_password"}'
```

### Step 6: Verify Installation

Visit `http://yourdomain.com` in your browser. You should see the login page.

## Development

### No Build Step Required!

Since the frontend uses vanilla JavaScript, there's no build step. Just edit the files in `Public/js/` and refresh your browser.

### Project Structure for Development

```
Public/
├── js/
│   ├── app.js               # Main app initialization
│   ├── types.js             # Type definitions (JSDoc)
│   ├── context/
│   │   ├── AuthContext.js   # Auth state (singleton pattern)
│   │   └── BudgetContext.js # Budget state (singleton pattern)
│   ├── pages/
│   │   ├── Login.js         # Login & register UI
│   │   └── BudgetDashboard.js # Main dashboard UI
│   └── utils/
│       ├── api.js           # API client (fetch wrapper)
│       └── router.js        # Client-side routing
```

### Adding New Features

1. **Add a new page**: Create a new file in `Public/js/pages/`
2. **Add a route**: In `Public/js/app.js`, add a route handler
3. **Add state**: Use the existing `AuthContext.js` or `BudgetContext.js` patterns
4. **Add API calls**: Extend `Public/js/utils/api.js`

### JavaScript Modules

All frontend code uses ES6 modules with `import/export` syntax. This is supported in all modern browsers without any build tools.

```javascript
// Importing
import { authManager } from './context/AuthContext.js';
import { budgetManager } from './context/BudgetContext.js';

// Exporting
class MyComponent {
    render() { /* ... */ }
}
export { MyComponent };
```

## Configuration

### Database Configuration

Edit `Public/config/database.php`:
```php
$host = 'localhost';
$dbname = 'budget_app';
$user = 'your_username';
$password = 'your_password';
```

### App Settings

Settings are stored in the `settings` table. You can modify them via SQL:
```sql
-- Change currency
UPDATE settings SET key_value = '$' WHERE user_id = 1 AND key_name = 'currency';

-- Change max partners (1 or 2)
UPDATE settings SET key_value = '1' WHERE user_id = 1 AND key_name = 'max_partners';

-- Change history retention (days)
UPDATE settings SET key_value = '60' WHERE user_id = 1 AND key_name = 'history_retention_days';
```

## Security Considerations

### Authentication
- Uses PHP sessions with `session_start()`
- Session data is stored server-side
- Session expiration: 30 minutes of inactivity

### Password Security
- Passwords are hashed with `password_hash()` using BCRYPT
- Minimum password length: 8 characters

### Data Validation
- Input validation on both client and server
- Amount range: 0 to 1,000,000
- Name length: 1 to 80 characters

### Database Security
- Each user can only access their own data (via `user_id` foreign keys)
- No raw SQL queries with user input (prepared statements used)

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
**Error**: "Unable to connect to the database"

**Solution**:
- Verify database credentials in `Public/config/database.php`
- Ensure MariaDB/MySQL server is running
- Check that the database user has permissions

#### 2. API Endpoints Return 404
**Error**: API requests return 404 Not Found

**Solution**:
- Ensure `mod_rewrite` is enabled in Apache
- Check `.htaccess` file exists in `Public/`
- Verify `AllowOverride All` is set in Apache config
- For Infomaniak: Ensure you uploaded to the correct directory

#### 3. JavaScript Modules Not Loading
**Error**: "Failed to load module" or "Cannot use import statement"

**Solution**:
- Ensure your browser supports ES6 modules (all modern browsers do)
- Make sure script tags use `type="module"`
- Check file paths are correct (relative to HTML file)

#### 4. Real-time Sync Not Working
**Error**: Changes don't sync across devices

**Solution**:
- Check browser console for SSE errors
- Verify PHP `output_buffering` is off
- Ensure no firewall is blocking long-lived connections
- Test with polling fallback (SSE should auto-fallback)

#### 5. PWA Not Installable
**Error**: PWA prompt doesn't appear

**Solution**:
- Ensure `manifest.json` is accessible
- Check service worker registration in browser dev tools
- Verify site is served over HTTPS (required for PWA)

### Debug Mode

Enable PHP error reporting in `Public/config/database.php`:
```php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
```

Enable JavaScript debug logging by adding `console.log()` statements in the JS files.

## API Examples

### Login
```bash
curl -X POST http://yourdomain.com/api/login.php \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your_password"}'
```

### Get Budget Items
```bash
curl -X GET http://yourdomain.com/api/budget_items.php \
  -H "Cookie: PHPSESSID=your_session_id"
```

### Update Budget Item
```bash
curl -X PUT "http://yourdomain.com/api/budget_items.php?id=1" \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=your_session_id" \
  -d '{"amount": 100.50}'
```

### Get Calculations
```bash
curl -X GET http://yourdomain.com/api/calculations.php \
  -H "Cookie: PHPSESSID=your_session_id"
```

### Undo Last Action
```bash
curl -X POST http://yourdomain.com/api/undo.php \
  -H "Cookie: PHPSESSID=your_session_id"
```

## Infomaniak-Specific Notes

### Hosting Configuration
- Infomaniak shared hosting **does not support Node.js or npm**
- This vanilla JS version works perfectly on Infomaniak
- No build step required - upload and go!

### Deployment Steps for Infomaniak

1. **Upload via FTP**:
   - Use FileZilla or Infomaniak's File Manager
   - Upload entire `Public` folder to your web root
   - Ensure `.htaccess` is uploaded (it's hidden, enable "show hidden files")

2. **Set up Database**:
   - Create database in Infomaniak control panel
   - Note the hostname (usually `localhost` or a specific server)
   - Create a database user with full permissions
   - Update `Public/config/database.php` with credentials

3. **Run Installer**:
   - Visit `http://yourdomain.com/install/setup.php`
   - This creates all tables and triggers
   - Delete or protect the `install/` folder after setup

4. **Create Admin User**:
   - Use the registration endpoint or SQL as described above

### Known Infomaniak Limitations
- No Node.js support on shared hosting
- No npm/yarn available
- PHP version: Usually 8.0+ (check in control panel)
- Database: MariaDB 10.5+

## Browser Support

The vanilla JavaScript frontend supports:
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome for Android)

All modern browsers support ES6 modules and the Fetch API used in this application.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is private and proprietary. All rights reserved.

## Credits

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: PHP, MariaDB
- **PWA**: Service Worker API

## Support

For issues or questions, please contact the project maintainer.
