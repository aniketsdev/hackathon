#!/bin/bash
# EC2 bootstrap: Docker + compose + 2GB swap (so the Next build fits on t3.micro/1GB).
set -eux

# 2GB swap for the Next.js build.
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

dnf update -y
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user

# docker compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -sSL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

touch /home/ec2-user/BOOTSTRAP_DONE
