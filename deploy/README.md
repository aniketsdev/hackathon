# Deployment — ComplyPatch AI on AWS

Single EC2 (t3.micro, Amazon Linux 2023) running the full stack via Docker Compose,
fronted by CloudFront for an HTTPS URL. Region: **us-east-1**.

## Topology
```
Internet ─▶ CloudFront (HTTPS) ─▶ EC2 nginx :80 ─┬─▶ Next.js  :3000  (UI + /api/scan)
                                                 └─▶ FastAPI :8000   (/api/github/* webhook, /health)
```

## Live URLs
- App:     see `.cfdomain`  (https://<domain>/)
- Webhook: https://<domain>/api/github/webhook  (POST, GitHub PR events)

## Resource IDs (in this folder)
- `.iid`      EC2 instance id
- `.sg`       security group id
- `.pubip` / `.pubdns`  instance public IP / DNS
- `.cfid` / `.cfdomain`  CloudFront distribution id / domain
- `complypatch-key.pem`  SSH key (chmod 600, gitignored)

## Common operations
- Redeploy after code changes:  `bash deploy/redeploy.sh`
- SSH:        `ssh -i deploy/complypatch-key.pem ec2-user@$(cat deploy/.pubip)`
- Logs:       `ssh ... 'cd ~/app && docker compose logs -f'`
- Restart:    `ssh ... 'cd ~/app && docker compose restart'`

## Notes
- Build uses the legacy Docker builder (`DOCKER_BUILDKIT=0`) because AL2023 ships an
  older buildx. 2GB swap is added so the Next.js build fits on 1GB RAM.
- Secrets live in `.env.production` on the instance (gitignored). No Postgres:
  `GITHUB_OPERATION_STORE=memory`.
- GitHub webhook secret must match `GITHUB_WEBHOOK_SECRET` in `.env.production`.

## Teardown
```
aws ec2 terminate-instances --instance-ids $(cat .iid)
aws cloudfront get-distribution-config --id $(cat .cfid)   # disable + delete
aws ec2 delete-security-group --group-id $(cat .sg)
aws ec2 delete-key-pair --key-name complypatch-key
```
