
---
title: "GitOps for Kubernetes with Argo CD"
description: "Streamline Kubernetes deployments with GitOps and Argo CD."
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/argo-gitops.jpg"
cardImageAlt: "ArgoCD managing Kubernetes workloads"
readTime: 4
tags: [ "kubernetes", "argocd", "gitops" ]
---

## What is GitOps?

GitOps is a modern approach to managing infrastructure and deploying software, using Git as the single source of truth. This technique leverages Git's powerful features to streamline and automate deployments. Pull Requests (PRs) are used to propose and review changes, enabling a fully auditable and transparent workflow. 

By using Git as the source of truth, GitOps ensures consistency across environments, minimises code duplication, and aligns development, staging, and production configurations. This builds confidence when applying changes to production.

With infrastructure as code (IaC), all configuration is stored and managed as code. Any infrastructure changes should be committed to the Git repository via PRs. Ideally, console-based changes should be avoided; however, if absolutely necessary, they should be short-lived and committed to the repository as soon as possible.

## What is Argo CD?

Argo CD is an enterprise-grade GitOps tool designed for Kubernetes deployments. It uses Git repositories as the source of truth for application state and supports various declarative deployment mechanisms such as Kubernetes manifests, Kustomize, Ksonnet, and Helm.

Argo CD operates as a Kubernetes controller, continuously monitoring the state of applications in the cluster and comparing them to the desired state defined in Git. It provides a visual interface to highlight differences and offers both manual and automated syncing options to reconcile discrepancies.

Argo CD resources are defined using Kubernetes manifests and can be managed via the CLI or the UI. A typical Argo CD Application is represented by a Kubernetes Custom Resource Definition (CRD). Here's an example:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: helm-guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook
```

This manifest defines an application called `guestbook`, specifying the source repository, target cluster, and namespace. 

## Sync Policies in Argo CD

The `syncPolicy` block defines how updates to the Git repository should be handled. An automated sync policy allows continuous deployment of changes. Here's an example configuration:

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
    allowEmpty: false
  syncOptions:
    - Validate=false
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
  retry:
    limit: 5
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m
```

This configuration enables automated syncing, resource pruning, and self-healing. It also includes retry logic and additional sync options to fine-tune deployment behaviour. For example:
- `Validate=false` disables resource validation.
- `CreateNamespace=true` ensures the namespace exists before deployment.

For a full Application specification, refer to the [official documentation](https://argo-cd.readthedocs.io/en/stable/).

## Getting Started with Argo CD

### Installation

You can install Argo CD in your Kubernetes cluster with the following commands:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Once installed, you can access the Argo CD UI using port forwarding:

```
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

The UI will be accessible at `localhost:8080`. The default username is `admin`, and the initial password can be retrieved using:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Creating Your First Application

Once logged into the Argo CD UI, you can create your first application by clicking the **New App** button. Use the [argocd-example-apps](https://github.com/argoproj/argocd-example-apps) repository as the source and select a specific application path.

If deploying to the same cluster where Argo CD is installed, set the destination cluster to `in-cluster`. Depending on the chosen sync policy, the application will either auto-sync (showing as "Synced") or remain "OutOfSync" until manually synced.

After syncing, the UI provides detailed insights into the application, including Kubernetes resources, Git information, and sync status.

## Monitoring Argo CD Applications

### Notifications

Argo CD offers robust notification capabilities to keep you informed about application state changes. The **Argo CD Notifications** component can send real-time updates to services like Slack, Teams, Telegram, Email, Opsgenie, Mattermost, Grafana, GitHub, or any custom webhook integration.

Triggers and templates allow fine-grained control over notification conditions and content. For example, you can configure notifications for events like deployment failures, sync operations, or health status changes.

### Prometheus Metrics

Argo CD natively exposes Prometheus metrics, enabling monitoring at two endpoints:
- `argocd-metrics:8082/metrics` for application metrics
- `argocd-server-metrics:8083/metrics` for API server metrics

### Grafana Dashboards

Argo CD integrates seamlessly with Grafana, and you can use pre-built dashboards to visualise application performance and health. Check out the [example dashboard](https://github.com/argoproj/argocd-example-dashboards) or the [demo dashboard](https://demo.argoproj.io).

## Conclusion

Every organisation should consider GitOps as a core strategy for managing cloud infrastructure. By combining the GitOps philosophy with Argo CD's powerful features, teams can achieve consistency, visibility, and confidence in their Kubernetes deployments.

If you have any questions about GitOps or implementing Argo CD, feel free to reach out!
