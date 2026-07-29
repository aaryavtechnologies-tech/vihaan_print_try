# VPS Deployment Guide for Vihaan Print

This guide walks you through deploying the Vihaan Print Next.js application on a Linux VPS (Ubuntu/Debian) and connecting it to the domain `vihaan.playvia.in`.

## Prerequisites

1.  A Linux VPS (Ubuntu 20.04/22.04 recommended).
2.  Your domain `vihaan.playvia.in` pointed to your VPS's public IP address (via an A Record in your DNS settings).
3.  Node.js (v18 or v20) and npm installed on the VPS.

## Step 1: Clone and Build the Application

SSH into your VPS and run the following commands:

```bash
# Clone the repository (or copy the files over)
git clone <your-repo-url> vihaan-print
cd vihaan-print

# Install dependencies
npm install

# Build the Next.js application
npm run build
```

## Step 2: Set up Environment Variables

Create a `.env` file in the root directory on your VPS with all your necessary variables (database URLs, keys, etc.). Make sure it contains everything from your local `.env` file.

```bash
nano .env
```
*(Paste your env contents, save, and exit)*

## Step 3: Start the Application with PM2

PM2 is a production process manager for Node.js. It will keep your app running in the background and restart it if it crashes.

```bash
# Install PM2 globally if you haven't already
sudo npm install -g pm2

# Start the application using the included ecosystem file
pm2 start ecosystem.config.js

# Save the PM2 list so it restarts on server reboots
pm2 save
pm2 startup
```
*(Run the command outputted by `pm2 startup` if prompted)*

## Step 4: Configure Nginx as a Reverse Proxy

Nginx will route traffic from your domain `vihaan.playvia.in` to the local Node.js server running on port 5030.

```bash
# Install Nginx
sudo apt update
sudo apt install nginx -y

# Copy the Nginx configuration file
sudo cp deploy/vihaan.playvia.in.conf /etc/nginx/sites-available/

# Enable the configuration by creating a symlink
sudo ln -s /etc/nginx/sites-available/vihaan.playvia.in.conf /etc/nginx/sites-enabled/

# Test the Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 5: Secure with SSL (HTTPS) via Certbot

To secure your site with HTTPS, use Let's Encrypt and Certbot.

```bash
# Install Certbot and the Nginx plugin
sudo apt install certbot python3-certbot-nginx -y

# Run Certbot to get and configure your SSL certificate
sudo certbot --nginx -d vihaan.playvia.in
```

Follow the prompts. Certbot will automatically modify your Nginx configuration to support HTTPS and handle renewals!

## Done! 🚀
Your application should now be live and accessible at `https://vihaan.playvia.in`.
