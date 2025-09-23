---
title: "Secrets Management at Scale with External Secrets Operator"
description: "Transform your Kubernetes secrets management with External Secrets Operator. Discover how to seamlessly sync secrets from AWS, Vault, and more whilst maintaining security and operational excellence at scale."
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

## Getting Started with External Secrets Operator

Installing ESO via Helm is straightforward, and the project maintainers have provided comprehensive production-ready configuration options:

```bash
# Add the External Secrets Operator Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Create dedicated namespace
kubectl create namespace external-secrets-system

# Install with production-ready configuration
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

> For production environments, Helm values and configuration should be stored in version control and applied through your chosen GitOps or CI/CD workflow

## Configuring AWS Secrets Manager Integration

Setting up AWS integration demonstrates ESO's well-considered design. Using IAM Roles for Service Accounts (IRSA) provides security best practices:

**IAM Policy for ESO:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:ACCOUNT-ID:secret:app/*"
    }
  ]
}
```

**SecretStore Configuration:**

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
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT-ID:role/external-secrets-role
```

The SecretStore acts as your configuration hub, defining how ESO connects to external systems. Once configured, it can be referenced by multiple ExternalSecrets, making it incredibly reusable and maintainable.

## Understanding ExternalSecrets

The ExternalSecret resource is the core component that enables declarative secret management. It provides a clear specification for retrieving secrets from external sources, transforming them as needed, and placing them in your cluster. This approach integrates naturally with GitOps workflows:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 300s
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: postgres-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: database/postgres/production
        property: username
    - secretKey: password
      remoteRef:
        key: database/postgres/production
        property: password
    - secretKey: host
      remoteRef:
        key: database/postgres/production
        property: host
```

This creates a standard Kubernetes secret named `postgres-credentials` that your applications consume exactly as they would any other secret. ESO handles the complexity of fetching, transforming, and maintaining the secret lifecycle automatically.

## Consuming Secrets in Your Applications

Once ESO creates the Kubernetes secret, consumption follows standard Kubernetes patterns. This consistency ensures development teams can leverage existing knowledge and workflows:

```yaml
containers:
  - name: app
    image: myapp:latest
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: postgres-credentials
            key: host
      - name: DB_PASSWORD
        valueFrom:
          secretKeyRef:
            name: postgres-credentials
            key: password
```

The secret appears as a native Kubernetes resource, complete with all the standard mounting and environment variable capabilities. This seamless integration makes ESO function as a natural extension of Kubernetes rather than an external addition.

## Automatic Secret Updates and Pod Restarts

One of ESO's most valuable features is automatic secret synchronisation, though handling application updates when secrets change requires careful consideration. **Mounted secrets are automatically updated** by Kubernetes—when ESO updates a secret, any pod with that secret mounted as a volume will see the new values within the configured `refreshInterval`.

However, environment variables from secrets are **not** automatically updated in running pods. This is where **Reloader** becomes particularly valuable, creating an effective combination with ESO:

```bash
# Install Reloader for automatic pod restarts
helm repo add stakater https://stakater.github.io/stakater-charts
helm install reloader stakater/reloader --namespace external-secrets-system
```

**Configuring automatic restarts when secrets change:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  namespace: production
  annotations:
    reloader.stakater.com/auto: "true"
    # Or target specific secrets:
    # reloader.stakater.com/search: "true"
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: host
```

This combination ensures your applications automatically receive updated secrets without manual intervention—ESO keeps secrets synchronised, and Reloader ensures pods restart when secrets change. It provides reliable automation for secret updates.

## Advanced Secret Transformation

ESO's templating capabilities provide significant value for complex environments. The operator can transform and combine multiple secrets into sophisticated configurations:

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
        # Create complete application configuration
        config.yaml: |
          database:
            url: "postgresql://{{ .db_username }}:{{ .db_password }}@{{ .db_host }}:5432/{{ .db_name }}"
            pool_size: 20
            ssl_mode: "require"

          redis:
            url: "redis://{{ .redis_password }}@{{ .redis_host }}:6379/0"

          api_keys:
            stripe: "{{ .stripe_key }}"
            sendgrid: "{{ .sendgrid_key }}"

        # Create environment file for applications expecting this format
        .env.production: |
          DATABASE_URL=postgresql://{{ .db_username }}:{{ .db_password }}@{{ .db_host }}:5432/{{ .db_name }}
          REDIS_URL=redis://{{ .redis_password }}@{{ .redis_host }}:6379/0
          STRIPE_API_KEY={{ .stripe_key }}
          SENDGRID_API_KEY={{ .sendgrid_key }}

  data:
    - secretKey: db_username
      remoteRef:
        key: database/postgres/production
        property: username
    - secretKey: db_password
      remoteRef:
        key: database/postgres/production
        property: password
    - secretKey: db_host
      remoteRef:
        key: database/postgres/production
        property: host
    - secretKey: db_name
      remoteRef:
        key: database/postgres/production
        property: database
    - secretKey: redis_password
      remoteRef:
        key: cache/redis/production
        property: password
    - secretKey: redis_host
      remoteRef:
        key: cache/redis/production
        property: host
    - secretKey: stripe_key
      remoteRef:
        key: external-apis/stripe
        property: api_key
    - secretKey: sendgrid_key
      remoteRef:
        key: external-apis/sendgrid
        property: api_key
```

This example demonstrates ESO's ability to aggregate secrets from multiple sources and generate complex configuration files. Instead of managing dozens of individual secrets, you create comprehensive configuration bundles that applications can consume directly.

## HashiCorp Vault Integration

For organisations using HashiCorp Vault, ESO provides excellent integration that leverages Vault's advanced features like dynamic credentials:

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
        jwt:
          path: "jwt"
          serviceAccountRef:
            name: vault-auth-sa
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dynamic-db-credentials
  namespace: production
spec:
  refreshInterval: 300s
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

**Why dynamic credentials matter:** Traditional database credentials often become stale, over-privileged, or compromised without detection. Vault's dynamic credentials create short-lived, unique credentials for each application instance. Combined with ESO's automatic refresh capabilities, this provides substantial security benefits—credentials are automatically rotated, and if compromised, they expire quickly.

## Multi-Cloud Secret Synchronization

ESO excels in multi-cloud environments, allowing you to replicate critical secrets across providers for disaster recovery:

```yaml
# Primary secrets from AWS
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys-primary
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
        property: api_key
---
# Backup secrets from Azure Key Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys-backup
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
```

**The multi-cloud advantage:** This pattern provides substantial resilience. If your primary secret store becomes unavailable, your applications can failover to the backup secrets automatically. ESO makes this pattern straightforward to implement and maintain.

## Secret Validation and Health Checks

One of ESO's most valuable yet underutilised features is the ability to validate secrets before they're used by applications. This prevents scenarios where rotating secrets inadvertently break application connectivity:

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
        validation-url: "https://api.service.com/validate"
        last-validated: '{{ now | date "2006-01-02T15:04:05Z07:00" }}'
  data:
    - secretKey: api_key
      remoteRef:
        key: external-apis/critical-service
        property: api_key
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: secret-validation
  namespace: production
spec:
  schedule: "*/15 * * * *"
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
                    echo "Secret validation failed - alerting required"
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

**Why secret validation matters:** In production environments, API keys can be revoked, database passwords can be changed externally, or certificates can expire. This validation pattern ensures your secrets are not just present, but actually functional. When validation fails, you receive immediate alerts rather than discovering issues through customer reports.

## Scaling External Secrets Operator

When operating ESO at scale, the default configuration might need tuning to handle your workload efficiently. The beauty of ESO is its built-in scaling capabilities:

```bash
# Scale ESO for high-throughput environments
helm upgrade external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --set replicaCount=3 \
  --set resources.limits.cpu=500m \
  --set resources.limits.memory=512Mi \
  --set webhook.replicaCount=3 \
  --set concurrent=15 \
  --set extraArgs="{--enable-flood-protection=true,--max-concurrent-reconciles=10}"
```

**Horizontal Pod Autoscaling** can be enabled to automatically scale based on CPU and memory usage:

```bash
helm upgrade external-secrets external-secrets/external-secrets \
  --set autoscaling.enabled=true \
  --set autoscaling.minReplicas=2 \
  --set autoscaling.maxReplicas=10 \
  --set autoscaling.targetCPUUtilizationPercentage=70
```

For organisations managing hundreds of ExternalSecrets, these scaling configurations ensure ESO remains responsive and efficient, handling secret synchronisation without becoming a bottleneck.

## Security Best Practices

ESO shines when implemented with proper security controls. **Network policies** ensure ESO can only communicate with necessary services:

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
    - to: []
      ports:
        - protocol: UDP
          port: 53
    - to: []
      ports:
        - protocol: TCP
          port: 443
```

**Fine-grained RBAC** ensures applications can only access their designated secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: app-secret-access
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
    resourceNames: ["app-*", "database-*"]
  - apiGroups: ["external-secrets.io"]
    resources: ["externalsecrets"]
    verbs: ["get", "list", "watch"]
```

These security controls ensure ESO operates within a least-privilege model, reducing the blast radius of any potential security incidents.

## Conclusion

External Secrets Operator represents a paradigm shift in how we approach secrets management in Kubernetes. What makes it truly special isn't just its technical capabilities—it's how thoughtfully designed it is for real-world operations.

The combination of seamless integration, robust scaling options, and sophisticated secret transformation makes ESO valuable for serious Kubernetes deployments. Whether you're managing a handful of applications or orchestrating secrets across hundreds of services and multiple cloud providers, ESO scales effectively with your requirements.

The real value emerges when you combine ESO with complementary tools like Reloader for automatic updates, implement proper validation patterns, and leverage its multi-cloud capabilities. Secret rotation becomes automatic, security posture improves significantly, and operational overhead is substantially reduced.

For teams currently managing secrets manually in Kubernetes, ESO offers a substantial improvement in workflow efficiency. For those already using basic secret management, ESO provides enterprise-grade security and automation capabilities that enhance operational reliability.
