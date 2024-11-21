---
title: "Kubernetes Auto and Scheduled Scaling"
description: "Efficiently scale Kubernetes for a robust, cost-effective cluster management"
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/kubernetes-scaling.jpg"
cardImageAlt: "Kubernetes scaling best practices"
readTime: 4
tags: ["kubernetes"]
---

Kubernetes autoscaling enables clusters to dynamically adjust to changes in demand, reducing over-provisioning and lowering operational costs. By combining autoscaling with strategies such as AWS Spot instances, organisations can achieve even greater cost efficiency.

The approach to scaling a Kubernetes cluster depends on the hosting platform. This post outlines the tools and techniques for autoscaling nodes and pods, applicable to any Kubernetes cluster, while also focusing on AWS/EKS-specific approaches. Additionally, we will explore scheduled scaling for nodes and pods and how it complements autoscaling to create a robust scaling strategy.

Effective scaling in Kubernetes requires coordination between the **pod layer** and the **node layer**. The **Horizontal Pod Autoscaler (HPA)** dynamically adjusts pod replicas, while the **Cluster Autoscaler (CA)** scales the number of nodes in the cluster. Together, these tools ensure that your Kubernetes cluster remains responsive and efficient.

## Kubernetes Autoscaling Overview

Kubernetes supports two primary scaling mechanisms:

- **Horizontal Pod Autoscaler (HPA):** Automatically adjusts the number of pod replicas based on resource usage or custom metrics.
- **Cluster Autoscaler (CA):** Adjusts the number of nodes in the cluster based on pod scheduling requirements.

Additionally, the **Vertical Pod Autoscaler (VPA)** can scale pod resource requests (CPU/Memory) dynamically, complementing the HPA.

## Autoscaling in Kubernetes

### Horizontal Pod Autoscaler (HPA)

The Horizontal Pod Autoscaler scales pods based on metrics such as CPU and memory usage, or custom/external metrics. While the metrics-server is typically used to fetch resource metrics, its capabilities can be extended with custom metrics APIs.

The HPA is a native Kubernetes API resource. The current stable version supports CPU autoscaling, while the beta version adds support for memory, custom, and external metrics.

Here’s an example of an HPA configuration for a deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hpa-example
spec:
  replicas: 1
  selector:
    matchLabels:
      run: hpa-example
  template:
    metadata:
      labels:
        run: hpa-example
    spec:
      containers:
        - name: hpa-example
          image: k8s.gcr.io/hpa-example
          ports:
            - containerPort: 80
          resources:
            limits:
              cpu: 500m
            requests:
              cpu: 200m
---
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: hpa-example
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hpa-example
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 50
```

You can achieve the same HPA setup imperatively:

```bash
kubectl autoscale deployment hpa-example --min=1 --max=10 --cpu-percent=50
```

If you encounter errors like `FailedGetResourceMetric`, ensure the metrics-server is installed. Install it with:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

To test HPA scaling, generate CPU load using:

```bash
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh -c "while sleep 0.01; do wget -q -O- http://hpa-example; done"
```

### Cluster Autoscaler (CA)

The Cluster Autoscaler automatically scales nodes in response to unscheduled pods due to resource constraints. It can either discover Auto Scaling Groups (ASGs) via tags or be configured manually.

Key features:

- Automatically adds nodes when pod scheduling fails.
- Scales down idle nodes after 10 minutes of inactivity.
- Respects ASG minimum/maximum values.

The CA requires appropriate IAM permissions to modify ASGs. You can attach these permissions to a ServiceAccount via an OIDC provider for better security.

#### Installation with Helm

Add the Cluster Autoscaler Helm repository:

```bash
helm repo add autoscaler https://kubernetes.github.io/autoscaler
```

**Option 1: Autodiscovery**

```bash
helm install autoscaler autoscaler/cluster-autoscaler \
  --set awsRegion=eu-west-1 \
  --set "autoDiscovery.clusterName=<Cluster Name>" \
  --set rbac.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::<AWS Account ID>:role/<CA Role>
```

Ensure ASGs are tagged appropriately:

- `k8s.io/cluster-autoscaler/<cluster-name>: owned`
- `k8s.io/cluster-autoscaler/enabled: TRUE`

**Option 2: Manual Configuration**

```
helm install autoscaler autoscaler/cluster-autoscaler \
  --set "autoscalingGroups[0].name=<Cluster ASG>" \
  --set "autoscalingGroups[0].maxSize=3" \
  --set "autoscalingGroups[0].minSize=1" \
  --set awsRegion=eu-west-1 \
  --set rbac.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::<AWS Account ID>:role/<CA Role>
```

Once installed, CA will scale nodes up or down based on pod requirements.

## Scheduled Scaling

Scheduled scaling complements autoscaling by preparing for predictable peaks. It can be implemented at the pod or node level:

### Pods

Use the `kubectl scale` command to manually adjust replicas:

```bash
kubectl scale --replicas=5 deployment/hpa-example
```

For automated pod scaling based on a schedule, use tools like `kube-schedule-scaler`. Example:

```yaml
zalando.org/schedule-actions: |
  [
    {"schedule": "00 14 * * Mon-Fri", "minReplicas": "4", "maxReplicas": "10"},
    {"schedule": "00 22 * * Mon-Fri", "minReplicas": "2", "maxReplicas": "10"}
  ]
```

Alternatively, you can use Kubernetes `CronJob` resources to scale deployments. Example:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up
spec:
  schedule: "0 8 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: scale
              image: bitnami/kubectl
              command:
                - /bin/sh
                - -c
                - kubectl scale --replicas=3 deployment/nginx
          restartPolicy: OnFailure
```

### Nodes

For AWS-hosted clusters, configure ASG scheduled scaling policies to match peak periods. Use Cluster Autoscaler to handle node termination for idle resources.

## Conclusion

Kubernetes offers powerful native tools for scaling, such as HPA and CA, which dynamically adjust resources to meet demand. By integrating these with scheduled scaling, organisations can prepare for predictable demand peaks while remaining adaptive to unforeseen changes.

Designing a scaling strategy requires understanding traffic patterns and application needs. If you have questions or need assistance with scaling Kubernetes clusters, feel free to reach out.
