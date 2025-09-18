---
title: "Secrets Management at Scale with External Secrets Operator"
description: "Synchronise secrets across multiple systems and cloud providers using External Secrets Operator for centralised, secure, and automated secrets management."
pubDate: 2024-09-15
author: "Billy"
cardImage: "@/images/blog/external-secrets-operator.jpg"
cardImageAlt: "External Secrets Operator managing secrets across cloud providers"
readTime: 11
tags:
  ["kubernetes", "secrets-management", "external-secrets-operator", "security"]
---

Managing secrets at scale across multiple environments, applications, and cloud providers presents significant challenges. Traditional approaches often result in secrets sprawl, inconsistent access patterns, and security vulnerabilities. External Secrets Operator (ESO) provides a Kubernetes-native solution for centralising secrets management whilst maintaining security and operational efficiency.

ESO synchronises secrets from external systems like AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, and Google Secret Manager into Kubernetes secrets. This approach eliminates the need to store sensitive data directly in container images or configuration files whilst enabling automated secret rotation and centralised access control.

## Understanding External Secrets Operator

### Architecture Overview

External Secrets Operator follows a controller pattern that watches for custom resources and synchronises secrets accordingly:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: external-secrets-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-secrets
  namespace: external-secrets-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: external-secrets
  template:
    metadata:
      labels:
        app.kubernetes.io/name: external-secrets
    spec:
      serviceAccountName: external-secrets
      containers:
        - name: external-secrets
          image: oci.external-secrets.io/external-secrets/external-secrets:v0.19.2
          ports:
            - containerPort: 8080
              name: metrics
          env:
            - name: POLLER_INTERVAL_MILLISECONDS
              value: "60000"
            - name: CONCURRENT_RECONCILES
              value: "10"
          resources:
            limits:
              cpu: 200m
              memory: 256Mi
            requests:
              cpu: 100m
              memory: 128Mi
```

### Core Components

ESO consists of several key components:

- **SecretStore**: Defines connection parameters to external secret systems
- **ClusterSecretStore**: Cluster-wide secret store configuration
- **ExternalSecret**: Specifies which secrets to fetch and how to transform them
- **SecretStoreRef**: References to secret stores from external secrets

## Installation and Configuration

### Helm Installation

Deploy External Secrets Operator using Helm for production environments:

```bash
# Add the External Secrets Operator Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Create namespace
kubectl create namespace external-secrets-system

# Install with custom values
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --set installCRDs=true \
  --set replicaCount=2 \
  --set resources.limits.cpu=200m \
  --set resources.limits.memory=256Mi \
  --set resources.requests.cpu=100m \
  --set resources.requests.memory=128Mi \
  --set serviceMonitor.enabled=true \
  --set webhook.replicaCount=2
```

### RBAC Configuration

Configure appropriate permissions for External Secrets Operator:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: external-secrets-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT-ID:role/external-secrets-role
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: external-secrets
rules:
  - apiGroups: [""]
    resources: ["secrets", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["external-secrets.io"]
    resources: ["secretstores", "clustersecretstores", "externalsecrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: external-secrets
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: external-secrets
subjects:
  - kind: ServiceAccount
    name: external-secrets
    namespace: external-secrets-system
```

## AWS Secrets Manager Integration

### IAM Role Configuration

Configure IAM permissions for accessing AWS Secrets Manager:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:ACCOUNT-ID:secret:app/*",
        "arn:aws:secretsmanager:*:ACCOUNT-ID:secret:database/*",
        "arn:aws:secretsmanager:*:ACCOUNT-ID:secret:external-apis/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": ["arn:aws:kms:*:ACCOUNT-ID:key/*"],
      "Condition": {
        "StringEquals": {
          "kms:ViaService": [
            "secretsmanager.us-east-1.amazonaws.com",
            "secretsmanager.us-west-2.amazonaws.com"
          ]
        }
      }
    }
  ]
}
```

### SecretStore Configuration

Create a SecretStore for AWS Secrets Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
        # Alternative: Use static credentials (not recommended for production)
        # secretRef:
        #   accessKeyID:
        #     name: aws-credentials
        #     key: access-key-id
        #   secretAccessKey:
        #     name: aws-credentials
        #     key: secret-access-key
---
# Service account with IRSA annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT-ID:role/external-secrets-role
```

### ExternalSecret for Database Credentials

Synchronise database credentials from AWS Secrets Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 300s # Refresh every 5 minutes
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore

  target:
    name: postgres-credentials
    creationPolicy: Owner
    template:
      type: Opaque
      engineVersion: v2
      data:
        # Template the secret data
        username: "{{ .username }}"
        password: "{{ .password }}"
        host: "{{ .host }}"
        port: "{{ .port }}"
        database: "{{ .database }}"
        # Create connection string
        connection-string: "postgresql://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/{{ .database }}"

  data:
    - secretKey: username
      remoteRef:
        key: database/postgres/main
        property: username

    - secretKey: password
      remoteRef:
        key: database/postgres/main
        property: password

    - secretKey: host
      remoteRef:
        key: database/postgres/main
        property: host

    - secretKey: port
      remoteRef:
        key: database/postgres/main
        property: port

    - secretKey: database
      remoteRef:
        key: database/postgres/main
        property: database
```

### Application Integration

Use the synchronised secrets in your applications:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-application
  template:
    metadata:
      labels:
        app: web-application
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: connection-string
            - name: DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
          envFrom:
            - secretRef:
                name: postgres-credentials
```

## HashiCorp Vault Integration

### Vault Configuration

Configure HashiCorp Vault as an external secret provider:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.company.com"
      path: "secret"
      version: "v2"
      auth:
        # JWT authentication with Kubernetes service account
        jwt:
          path: "jwt"
          serviceAccountRef:
            name: vault-auth-sa
        # Alternative: AppRole authentication
        # appRole:
        #   path: "approle"
        #   roleId: "role-id-here"
        #   secretRef:
        #     name: vault-approle
        #     key: secret-id
      caBundle: LS0tLS1CRUdJTi... # Base64 encoded CA certificate
      namespace: "tenant/production" # Vault Enterprise namespace
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vault-auth-sa
  namespace: production
```

### Vault Policy Configuration

Configure Vault policies for external secrets access:

```hcl
# vault-policy.hcl
path "secret/data/app/*" {
  capabilities = ["read"]
}

path "secret/data/database/*" {
  capabilities = ["read"]
}

path "secret/data/external-apis/*" {
  capabilities = ["read"]
}

path "auth/jwt/login" {
  capabilities = ["create", "read"]
}
```

### Dynamic Database Credentials

Use Vault's dynamic database credentials:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dynamic-db-credentials
  namespace: production
spec:
  refreshInterval: 300s # Refresh every 5 minutes for credential rotation
  secretStoreRef:
    name: vault-backend
    kind: SecretStore

  target:
    name: dynamic-postgres-creds
    creationPolicy: Owner

  data:
    - secretKey: username
      remoteRef:
        key: database/creds/readonly
        property: username

    - secretKey: password
      remoteRef:
        key: database/creds/readonly
        property: password
```

## Multi-Cloud Secret Synchronisation

### Azure Key Vault Integration

Configure External Secrets Operator for Azure Key Vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: production
spec:
  provider:
    azurekv:
      vaultUrl: "https://my-keyvault.vault.azure.net/"
      tenantId: "tenant-id-here"
      authType: ServicePrincipal
      clientId: "client-id-here"
      clientSecret:
        secretRef:
          name: azure-secret-sp
          key: ClientSecret
      # Alternative: Use Managed Identity
      # authType: ManagedIdentity
      # clientId: "managed-identity-client-id"
---
apiVersion: v1
kind: Secret
metadata:
  name: azure-secret-sp
  namespace: production
type: Opaque
data:
  ClientSecret: <base64-encoded-client-secret>
```

### Google Secret Manager Integration

Configure Google Secret Manager provider:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: google-secret-manager
spec:
  provider:
    gcpsm:
      projectId: "my-gcp-project"
      auth:
        workloadIdentity:
          clusterLocation: us-central1-a
          clusterName: production-cluster
          serviceAccountRef:
            name: external-secrets-gcp-sa
        # Alternative: Use service account key
        # secretRef:
        #   secretAccessKey:
        #     name: gcp-secret
        #     key: secret-access-credentials
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-gcp-sa
  namespace: external-secrets-system
  annotations:
    iam.gke.io/gcp-service-account: external-secrets@my-gcp-project.iam.gserviceaccount.com
```

### Cross-Cloud Secret Replication

Replicate secrets across multiple cloud providers:

```yaml
# Primary secret in AWS
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys-aws
  namespace: production
spec:
  refreshInterval: 3600s
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: external-api-keys
  data:
    - secretKey: stripe-api-key
      remoteRef:
        key: external-apis/stripe
        property: api-key
    - secretKey: sendgrid-api-key
      remoteRef:
        key: external-apis/sendgrid
        property: api-key
---
# Backup secret in Azure
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys-azure-backup
  namespace: production
spec:
  refreshInterval: 3600s
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: external-api-keys-backup
  data:
    - secretKey: stripe-api-key
      remoteRef:
        key: stripe-api-key
    - secretKey: sendgrid-api-key
      remoteRef:
        key: sendgrid-api-key
```

## Advanced Secret Management Patterns

### Secret Rotation and Lifecycle Management

Implement automated secret rotation with External Secrets Operator:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotating-database-password
  namespace: production
  annotations:
    external-secrets.io/rotation-policy: "automatic"
    external-secrets.io/rotation-interval: "30d"
spec:
  refreshInterval: 60s # Check for updates every minute
  secretStoreRef:
    name: vault-backend
    kind: SecretStore

  target:
    name: rotating-db-credentials
    creationPolicy: Owner
    deletionPolicy: Retain

  data:
    - secretKey: username
      remoteRef:
        key: database/creds/app-user
        property: username

    - secretKey: password
      remoteRef:
        key: database/creds/app-user
        property: password

    - secretKey: lease_id
      remoteRef:
        key: database/creds/app-user
        property: lease_id
```

### Secret Transformation and Templating

Transform secrets during synchronisation:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: application-config
  namespace: production
spec:
  refreshInterval: 300s
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore

  target:
    name: app-configuration
    creationPolicy: Owner
    template:
      type: Opaque
      engineVersion: v2
      data:
        # Create complex configuration from multiple secrets
        config.yaml: |
          database:
            host: "{{ .db_host }}"
            port: {{ .db_port }}
            username: "{{ .db_username }}"
            password: "{{ .db_password }}"
            ssl_mode: "require"

          redis:
            url: "redis://{{ .redis_username }}:{{ .redis_password }}@{{ .redis_host }}:{{ .redis_port }}/0"

          external_apis:
            stripe:
              api_key: "{{ .stripe_api_key }}"
              webhook_secret: "{{ .stripe_webhook_secret }}"
            sendgrid:
              api_key: "{{ .sendgrid_api_key }}"

          encryption:
            key: "{{ .encryption_key | b64enc }}"

          jwt:
            secret: "{{ .jwt_secret }}"
            expiry: "24h"

        # Create environment-specific files
        .env.production: |
          DATABASE_URL=postgresql://{{ .db_username }}:{{ .db_password }}@{{ .db_host }}:{{ .db_port }}/{{ .db_name }}
          REDIS_URL=redis://{{ .redis_username }}:{{ .redis_password }}@{{ .redis_host }}:{{ .redis_port }}/0
          STRIPE_API_KEY={{ .stripe_api_key }}
          SENDGRID_API_KEY={{ .sendgrid_api_key }}
          JWT_SECRET={{ .jwt_secret }}

  data:
    - secretKey: db_host
      remoteRef:
        key: database/postgres/production
        property: host
    - secretKey: db_port
      remoteRef:
        key: database/postgres/production
        property: port
    - secretKey: db_username
      remoteRef:
        key: database/postgres/production
        property: username
    - secretKey: db_password
      remoteRef:
        key: database/postgres/production
        property: password
    - secretKey: db_name
      remoteRef:
        key: database/postgres/production
        property: database
    - secretKey: redis_host
      remoteRef:
        key: cache/redis/production
        property: host
    - secretKey: redis_port
      remoteRef:
        key: cache/redis/production
        property: port
    - secretKey: redis_username
      remoteRef:
        key: cache/redis/production
        property: username
    - secretKey: redis_password
      remoteRef:
        key: cache/redis/production
        property: password
    - secretKey: stripe_api_key
      remoteRef:
        key: external-apis/stripe
        property: api_key
    - secretKey: stripe_webhook_secret
      remoteRef:
        key: external-apis/stripe
        property: webhook_secret
    - secretKey: sendgrid_api_key
      remoteRef:
        key: external-apis/sendgrid
        property: api_key
    - secretKey: encryption_key
      remoteRef:
        key: application/encryption
        property: key
    - secretKey: jwt_secret
      remoteRef:
        key: application/jwt
        property: secret
```

### Secret Validation and Health Checks

Implement secret validation and health monitoring:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: validated-api-credentials
  namespace: production
spec:
  refreshInterval: 300s
  secretStoreRef:
    name: vault-backend
    kind: SecretStore

  target:
    name: api-credentials
    creationPolicy: Owner
    template:
      type: Opaque
      engineVersion: v2
      data:
        api-key: "{{ .api_key }}"
        # Add validation metadata
        validation-url: "https://api.service.com/validate"
        last-validated: '{{ now | date "2006-01-02T15:04:05Z07:00" }}'

  data:
    - secretKey: api_key
      remoteRef:
        key: external-apis/critical-service
        property: api_key

# Health check for secret validation
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: secret-validation
  namespace: production
spec:
  schedule: "*/15 * * * *" # Every 15 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: validator
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  API_KEY=$(cat /secrets/api-key)
                  VALIDATION_URL=$(cat /secrets/validation-url)

                  if curl -f -H "Authorization: Bearer $API_KEY" "$VALIDATION_URL"; then
                    echo "Secret validation successful"
                  else
                    echo "Secret validation failed"
                    exit 1
                  fi
              volumeMounts:
                - name: api-credentials
                  mountPath: /secrets
                  readOnly: true
          volumes:
            - name: api-credentials
              secret:
                secretName: api-credentials
          restartPolicy: OnFailure
```

## Monitoring and Observability

### Metrics and Monitoring

Configure monitoring for External Secrets Operator:

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: external-secrets-metrics
  namespace: external-secrets-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: external-secrets
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: external-secrets-alerts
  namespace: external-secrets-system
spec:
  groups:
    - name: external-secrets
      rules:
        - alert: ExternalSecretSyncFailure
          expr: external_secrets_sync_calls_error > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "External Secret sync failure"
            description: "ExternalSecret {{ $labels.name }} in namespace {{ $labels.namespace }} is failing to sync"

        - alert: ExternalSecretStale
          expr: (time() - external_secrets_sync_calls_total) > 3600
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "External Secret not synced recently"
            description: "ExternalSecret {{ $labels.name }} has not synced for over 1 hour"

        - alert: SecretStoreConnectionFailure
          expr: external_secrets_secret_store_connection_status == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Secret Store connection failure"
            description: "Secret Store {{ $labels.name }} is not reachable"
```

### Logging and Auditing

Configure comprehensive logging for security auditing:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: external-secrets-config
  namespace: external-secrets-system
data:
  config.yaml: |
    logging:
      level: info
      format: json
    metrics:
      addr: ":8080"
    webhook:
      port: 9443
      certDir: "/tmp/k8s-webhook-server/serving-certs"
    audit:
      enabled: true
      logSecretAccess: true
      logSecretSync: true
    security:
      encryptionInTransit: true
      validateRemoteCertificates: true
---
# Fluent Bit configuration for log forwarding
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: external-secrets-system
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off

    [INPUT]
        Name              tail
        Path              /var/log/containers/external-secrets-*.log
        Parser            docker
        Tag               external-secrets.*
        Refresh_Interval  5

    [FILTER]
        Name                parser
        Match               external-secrets.*
        Key_Name            log
        Parser              json
        Reserve_Data        True

    [FILTER]
        Name                grep
        Match               external-secrets.*
        Regex               level (error|warn|info)

    [OUTPUT]
        Name                cloudwatch_logs
        Match               external-secrets.*
        region              us-east-1
        log_group_name      /eks/external-secrets
        log_stream_prefix   external-secrets-
        auto_create_group   true
```

## Security Best Practices

### Network Security

Implement network policies for External Secrets Operator:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: external-secrets-network-policy
  namespace: external-secrets-system
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: external-secrets
  policyTypes:
    - Ingress
    - Egress

  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
      ports:
        - protocol: TCP
          port: 8080

  egress:
    # Allow DNS resolution
    - to: []
      ports:
        - protocol: UDP
          port: 53

    # Allow HTTPS to external secret providers
    - to: []
      ports:
        - protocol: TCP
          port: 443

    # Allow communication with Kubernetes API
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: TCP
          port: 6443
```

### Encryption and Data Protection

Configure encryption for secrets in transit and at rest:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: secure-vault-store
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.company.com"
      path: "secret"
      version: "v2"
      auth:
        jwt:
          path: "jwt"
          serviceAccountRef:
            name: vault-auth-sa
      caBundle: LS0tLS1CRUdJTi... # Verify server certificates
      namespace: "tenant/production"
      # Enable TLS verification
      tls:
        serverName: "vault.company.com"
        insecureSkipVerify: false
        caCert:
          secretRef:
            name: vault-ca-cert
            key: ca.crt
        clientCert:
          secretRef:
            name: vault-client-cert
            key: tls.crt
        clientKey:
          secretRef:
            name: vault-client-cert
            key: tls.key
```

### Access Control and RBAC

Implement fine-grained access control:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: external-secrets-app
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
    resourceNames: ["app-*", "database-*"] # Limit to specific secret patterns

  - apiGroups: ["external-secrets.io"]
    resources: ["externalsecrets"]
    verbs: ["get", "list", "watch"]

  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: external-secrets-app-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: external-secrets-app-sa
    namespace: production
roleRef:
  kind: Role
  name: external-secrets-app
  apiGroup: rbac.authorization.k8s.io
---
# Application-specific service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-app-sa
  namespace: production
  annotations:
    external-secrets.io/secret-store-access: "app-secrets-only"
```

## Disaster Recovery and Backup

### Multi-Region Secret Replication

Implement disaster recovery for secrets management:

```yaml
# Primary region secret store
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-primary-region
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-primary
            namespace: external-secrets-system
---
# DR region secret store
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-dr-region
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-dr
            namespace: external-secrets-system
---
# Primary external secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: critical-secrets-primary
  namespace: production
spec:
  refreshInterval: 300s
  secretStoreRef:
    name: aws-primary-region
    kind: ClusterSecretStore
  target:
    name: critical-application-secrets
  data:
    - secretKey: database-password
      remoteRef:
        key: production/database/master
        property: password
---
# Fallback external secret for DR
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: critical-secrets-dr-fallback
  namespace: production
spec:
  refreshInterval: 300s
  secretStoreRef:
    name: aws-dr-region
    kind: ClusterSecretStore
  target:
    name: critical-application-secrets-dr
  data:
    - secretKey: database-password
      remoteRef:
        key: production/database/master
        property: password
```

### Backup and Recovery Automation

Automate secret backup and recovery procedures:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: secrets-backup
  namespace: external-secrets-system
spec:
  schedule: "0 2 * * *" # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secrets-backup-sa
          containers:
            - name: backup
              image: alpine/k8s:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Export all external secrets configurations
                  kubectl get externalsecrets -A -o yaml > /backup/externalsecrets-$(date +%Y%m%d).yaml
                  kubectl get secretstores -A -o yaml > /backup/secretstores-$(date +%Y%m%d).yaml
                  kubectl get clustersecretstores -o yaml > /backup/clustersecretstores-$(date +%Y%m%d).yaml

                  # Upload to S3 or backup storage
                  aws s3 sync /backup/ s3://secrets-backup-bucket/kubernetes-secrets/

                  # Cleanup old backups (keep 30 days)
                  find /backup -name "*.yaml" -mtime +30 -delete
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
              env:
                - name: AWS_REGION
                  value: us-east-1
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: backup-pvc
          restartPolicy: OnFailure
```

## Conclusion

External Secrets Operator transforms secrets management in Kubernetes environments by providing centralised, secure, and automated secret synchronisation across multiple cloud providers and secret management systems. This approach eliminates secrets sprawl whilst enabling sophisticated patterns like automatic rotation, cross-cloud replication, and fine-grained access control.

The key to successful implementation lies in careful planning of secret stores, implementing proper RBAC controls, and establishing comprehensive monitoring and alerting. Start with simple use cases like database credentials, then gradually expand to more complex scenarios involving multiple cloud providers and dynamic secret rotation.

By leveraging External Secrets Operator, organisations can achieve enterprise-grade secrets management that scales with their infrastructure whilst maintaining security best practices and operational efficiency. The investment in proper secrets management pays dividends through reduced security risks, simplified operations, and improved compliance posture.
