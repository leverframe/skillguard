#!/usr/bin/env bash
# Installs the skillguard-indexer systemd timer on a fleet Linux host.
# Run as root (or with sudo).
set -euo pipefail

SERVICE_NAME="skillguard-indexer"
INSTALL_DIR="/opt/skillguard"
LOG_DIR="/var/log/skillguard"
RUN_USER="openclaw"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: run as root (sudo $0)" >&2
  exit 1
fi

echo "Creating ${INSTALL_DIR}..."
install -d -o "${RUN_USER}" -g "${RUN_USER}" "${INSTALL_DIR}"
install -d -o "${RUN_USER}" -g "${RUN_USER}" "${LOG_DIR}"

echo "Copying dist/..."
cp -r dist/ "${INSTALL_DIR}/dist/"
cp package.json "${INSTALL_DIR}/"

echo "Installing production dependencies..."
(cd "${INSTALL_DIR}" && npm install --omit=dev --ignore-scripts)

if [[ ! -f "${INSTALL_DIR}/.env" ]]; then
  echo "ERROR: ${INSTALL_DIR}/.env missing. Create with:" >&2
  echo "  echo GITHUB_TOKEN=ghp_xxx > ${INSTALL_DIR}/.env" >&2
  echo "  chown ${RUN_USER}:${RUN_USER} ${INSTALL_DIR}/.env" >&2
  echo "  chmod 600 ${INSTALL_DIR}/.env" >&2
  exit 1
fi
chmod 600 "${INSTALL_DIR}/.env"
chown "${RUN_USER}:${RUN_USER}" "${INSTALL_DIR}/.env"

echo "Installing systemd units..."
cp ops/skillguard-indexer.service /etc/systemd/system/
cp ops/skillguard-indexer.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now skillguard-indexer.timer

echo ""
echo "Installed. Verify with:"
echo "  systemctl status skillguard-indexer.timer"
echo "  systemctl list-timers skillguard-indexer"
echo "  journalctl -u skillguard-indexer -f"
echo ""
echo "Manual one-shot run:"
echo "  systemctl start skillguard-indexer.service"
