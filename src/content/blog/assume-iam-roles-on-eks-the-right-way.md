---
title: "Assume IAM Roles on EKS, the right way"
description: "How to set up and use IAM Roles for Service Accounts in EKS to securely manage pod-level IAM roles"
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/eks-iam.jpg"
cardImageAlt: "Illustration of IAM roles on AWS EKS"
readTime: 4
tags: [ "kubernetes", "eks", "aws", "iam" ]
---

Before the introduction of IAM Roles for Service Accounts (IRSA), managing IAM roles for pods running in EKS was a tad limited. The easiest option was to assign pod permissions directly to the EKS nodes. However, this approach came with a major downside: it was impossible to follow least-privilege practices. Any pod running on that node would have access to those extended permissions.

To address this, third-party solutions like **Kiam** and **kube2iam** were introduced. These tools allowed us to specify IAM roles at the pod level using annotations, but they introduced their own complexities and dependencies.

AWS implemented native functionality to solve this problem through IRSA, which eliminates the need for third-party solutions like kube2iam. Despite this, I’ve noticed kube2iam still in use in some clusters. Here's a quick guide on how to set up and leverage IRSA.

## Initial OIDC Setup

IRSA relies on an OpenID Connect (OIDC) Identity Provider to allow EKS service accounts to assume IAM roles within your AWS account. EKS automatically generates an OIDC provider URL for your cluster; all you need to do is create the corresponding IAM Identity Provider.

If you're using the AWS EKS Terraform module, this step is straightforward. You can enable IRSA by passing `enable_irsa = true` to the module:

```hcl
module "eks" {
  source      = "terraform-aws-modules/eks/aws"
  enable_irsa = true
}
```

That's it! Once this is done, pods running in your EKS cluster can assume IAM roles in the same account.

## Creating IAM Roles for EKS

To allow EKS pods to assume an IAM role, we need to add the OIDC Identity Provider as a trusted entity in the IAM role. One of the simplest ways to accomplish this is by using the `iam-assumable-role-with-oidc` Terraform module.

```hcl
module "assumable_role" {
  source      = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  create_role = true
  role_name   = "assumable-role"

  provider_url = module.eks.cluster_oidc_issuer_url

  role_policy_arns = [
    aws_iam_policy.example.arn
  ]
}
```

This will create an IAM role that can be assumed by any service account in the EKS cluster.

## Associating IAM Roles with Service Accounts

To allow a pod to assume an IAM role, you simply need to add an annotation to the service account. The annotation specifies the role ARN for the IAM role you want the pod to assume.

```yaml
eks.amazonaws.com/role-arn: <<role-arn>>
```

With this annotation, any workload using the service account will have the permissions granted by the associated IAM role.

## Restricting Access to Specific Service Accounts

By default, the above setup allows any service account in the cluster to assume the role. To restrict access to specific service accounts, you can modify the trust policy of the IAM role. If you're using the Terraform module, you can specify allowed service accounts via the `oidc_fully_qualified_subjects` list:

```hcl
module "assumable_role" {
  source                     = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  create_role                = true
  oidc_fully_qualified_subjects = ["system:serviceaccount:namespace:service-account-name"]
}
```

This ensures that only specific service accounts can assume the role.


## Conclusion

While tools like Kiam and kube2iam have been helpful in the past, IRSA provides a simple, native solution for managing pod-level IAM roles in EKS. It eliminates the need for third-party dependencies and offers more straightforward role assumption. With just a few steps, you can set up IRSA and securely grant your pods the IAM permissions they need.
