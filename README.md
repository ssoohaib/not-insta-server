# not-insta-server-

Server has all the necessary routes, middlewares, and utilizes S3 bucket to store user images. Also a cron job runs every minute to welcome new users.
<br/>
Also production branch is connected to Railway and the server can be accessed with the following url:
<br/>
https://not-insta-server-production.up.railway.app/

## Installation

Install not-insta-server with npm

```bash
  git clone https://github.com/ssoohaib/not-insta-server.git
  cd ./not-insta-server
  git checkout master
  npm install
```

## Run

```bash
  node server.js
```
    
## .env

Install not-insta-server with npm

```bash
  PORT=

  DB_USER=
  DB_HOST=
  DB_PASSWORD=
  DB_NAME=
  DB_PORT=

  EMAIL_USER=
  EMAIL_PASSWORD=

  JWT_SECRET=

  AWS_BUCKET_NAME=
  AWS_BUCKET_REGION=
  AWS_ACCESS_KEY=
  AWS_SECRET_ACCESS_KEY=
```
    
## DB Schemas

```bash
-- USER TABLE########################################
CREATE TABLE users (
  uuid UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_picture TEXT DEFAULT 'N/A',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- OTP-CODES TABLE########################################
CREATE TABLE otp_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE
);

-- USER-TOKENS TABLE########################################
CREATE TABLE user_tokens (
  uuid UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(uuid) ON DELETE CASCADE,
  accessToken TEXT NOT NULL,
  accessToken_expires_at TIMESTAMP NOT NULL,
  refreshToken TEXT NOT NULL,
  refreshToken_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_token UNIQUE (user_id)
);

-- INTERESTS TABLE########################################
CREATE TABLE interests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  icon TEXT NOT NULL
);

-- USER-INTERESTS TABLE########################################
CREATE TABLE user_interests (
  user_id UUID REFERENCES users(uuid) ON DELETE CASCADE,
  interest_id INT REFERENCES interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

-- USER-IMAGES TABLE########################################
CREATE TABLE user_images (
  uuid UUID PRIMARY KEY,
  user_id UUID REFERENCES users(uuid) ON DELETE CASCADE,
  image_name TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- IMAGES-CATEGORIES TABLE########################################
CREATE TABLE images_categories (
  image_id UUID REFERENCES user_images(uuid) ON DELETE CASCADE,
  category_id INT REFERENCES interests(id) ON DELETE CASCADE,
  PRIMARY KEY (image_id, category_id)
);

```
    
