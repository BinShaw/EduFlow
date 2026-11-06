#!/usr/bin/env bash
set -euo pipefail
umask 077
if [[ $# -ne 3 ]]; then
  echo 'Usage: bash infra/backup.sh <absolute compose env> <backup directory outside project> <GPG recipient>' >&2
  exit 1
fi
config_file=$(realpath "$1")
backup_dir=$(realpath -m "$2")
project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
case "$backup_dir/" in
  "$project_dir/"*) echo 'Use a backup directory outside the project.' >&2; exit 1 ;;
esac
command -v gpg >/dev/null
mkdir -p "$backup_dir"
backup_file="$backup_dir/eduflow-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"
docker compose --env-file "$config_file" -f "$project_dir/infra/compose.yaml" exec -T db \
  sh -c 'exec pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gpg --batch --encrypt --recipient "$3" --output "$backup_file"
echo "Encrypted backup written to $backup_file. Copy off-host and verify restoration."
