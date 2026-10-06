#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root on the Oracle VM."
  exit 1
fi

if [ -z "${TALUS_HOST:-}" ]; then
  echo "Set TALUS_HOST to the hostname that points at this VM."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y docker.io docker-compose-v2 iptables-persistent

systemctl enable --now docker

if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if command -v iptables >/dev/null 2>&1; then
  iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 80 -j ACCEPT
  iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 443 -j ACCEPT
  netfilter-persistent save
fi

mkdir -p /var/talus/data
if [ ! -s /var/talus/data/talus.db ]; then
  echo "Copy talus.db into /var/talus/data before starting the API."
  exit 1
fi

cd "$(dirname "$0")"
docker compose up -d --build

echo "Waiting for Caddy to obtain a certificate..."
sleep 5
echo "Check https://${TALUS_HOST}/api/health"
