---
title: "Kubernetes AWS Load Balancer Controller"
description: "Lowdown on the AWS Load Balancer Controller for Kubernetes ingress."
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/aws-load-balancer-controller.jpg"
cardImageAlt: "Kubernetes AWS Load Balancer Controller"
readTime: 2
tags: ["kubernetes", "aws", "ingress-controller"]
---

# Kubernetes AWS Load Balancer Controller

The AWS Load Balancer Controller (formerly known as the ALB Ingress Controller) integrates natively with AWS Application Load Balancers (ALB) and Network Load Balancers (NLB). This enables seamless traffic routing into your Kubernetes cluster using AWS-managed load balancers.

If you’re running Kubernetes on AWS, the AWS Load Balancer Controller is worth evaluating. It leverages the built-in elasticity, scalability, and redundancy of AWS load balancers, ensuring robust and reliable ingress for your workloads. Additionally, the controller supports features like ingress grouping, allowing you to share a single ALB across multiple services and reduce costs.

Keep in mind, however, that the controller does not automatically update after installation. Any upgrades will need to be applied manually via your deployment process.

## Installation

The AWS Load Balancer Controller can be installed using several methods. In this guide, we’ll use a method that avoids attaching IAM permissions directly to worker nodes. Instead, we’ll assign the required IAM policy to a service account for better security and manageability. However, if you’re not leveraging Fargate, attaching permissions directly to worker nodes is still a valid option.

### Steps to Install

1. **Create the IAM policy**

   Attach the following policy to the IAM role associated with your worker nodes or service account:
   [IAM Policy JSON](https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/main/docs/install/iam_policy.json).

2. **Add the EKS repository to Helm**

   ```bash
   helm repo add eks https://aws.github.io/eks-charts
   helm repo update
   ```

3. **Install the TargetGroupBinding CRDs**

   ```bash
   kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"
   ```

4. **Install the AWS Load Balancer Controller**

   Replace `<cluster-name>` with your actual cluster name:

   ```bash
   helm install ingress eks/aws-load-balancer-controller -n kube-system --set clusterName=<cluster-name>
   ```

5. **Deploy ingress resources**

   Once installed, ingress resources will trigger the creation of load balancer resources.

## Ingress

Ingress resources expose routes from external clients to services within the Kubernetes cluster. When using the AWS Load Balancer Controller, ingress resources can create either an ALB or NLB based on the `ingress.class` annotation.

By default, each ingress resource creates its own ALB. However, you can consolidate rules into a single ALB by using the `alb.ingress.kubernetes.io/group.name` annotation.

### Example Ingress Resource

The following example creates a public ALB. If the subnet annotation is omitted, the controller auto-discovers subnets with the appropriate tags.

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: echoserver
  namespace: default
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/group.name: myalb
spec:
  rules:
    - http:
        paths:
          - path: "/"
            backend:
              serviceName: echoserver
              servicePort: 80
```

#### Troubleshooting

If you encounter the following error:
`Failed deploy model due to InvalidParameter: 1 validation error(s) found. - minimum field value of 1, CreateTargetGroupInput.Port`,
verify that the service is using `NodePort`. The AWS Load Balancer Controller requires `NodePort`, whereas other controllers may work with `ClusterIP`.

## Ingress Annotations

Below is a summary of key annotations to configure ingress resources:

- **alb.ingress.kubernetes.io/group.name**
  Defines whether rules remain within a single ALB. Omitting this annotation creates a separate load balancer for each ingress.

- **alb.ingress.kubernetes.io/security-groups**
  Specifies the security groups to attach to the load balancer. If omitted, a default security group is created to allow traffic from defined CIDRs.

- **alb.ingress.kubernetes.io/subnets**
  Identifies subnets to be used by the load balancer. If omitted, subnets are auto-discovered based on the following tags:
  - `kubernetes.io/cluster/<cluster-name>: owned`
  - `kubernetes.io/role/internal-elb: 1` (for internal load balancers)
  - `kubernetes.io/role/elb: 1` (for internet-facing load balancers)

For a full list of annotations, refer to the [AWS Load Balancer Controller documentation](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.0/guide/ingress/annotations/).

## Testing the Setup

To test the AWS Load Balancer Controller, deploy the echo server with the following commands. Using the example ingress resource above, you can send a request to the ALB, which routes traffic to the `echoserver` service and pods.

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.0.0/docs/examples/echoservice/echoserver-namespace.yaml &&\
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.0.0/docs/examples/echoservice/echoserver-service.yaml &&\
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.0.0/docs/examples/echoservice/echoserver-deployment.yaml
```

## Considerations

The AWS Load Balancer Controller's functionality is aligned with AWS load balancer capabilities. Here are some important considerations:

1. **Exact Path Rules**
   ALB path rules are exact, meaning the `Ingress pathType` isn’t fully supported. You can use wildcards in the `Ingress` path as a workaround.

2. **URL Rewrite Rules**
   Unlike some other ingress controllers, URL rewrite rules aren’t natively supported. Redirects can be implemented via actions, but complex rewrites are not possible.

## Conclusion

The AWS Load Balancer Controller is an excellent choice for those who prefer AWS-native solutions and want to leverage ALBs or NLBs for Kubernetes ingress. It offers seamless integration, elasticity, and cost-saving features like ingress grouping. However, for workloads that require advanced ingress capabilities such as complex URL rewrites, other ingress controllers may be better suited.

If your needs align with the capabilities of AWS load balancers, the AWS Load Balancer Controller can provide a reliable and scalable ingress solution for your Kubernetes cluster.
