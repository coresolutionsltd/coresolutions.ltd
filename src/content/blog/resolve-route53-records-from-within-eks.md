---
title: "Resolve Route53 Records from Within EKS"
description: "Enable seamless DNS resolution for private Route53 records directly within your EKS cluster using CoreDNS."
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/coredns-route53.jpg"
cardImageAlt: "Resolve Route53 Records from Within EKS"
readTime: 2
tags: ["aws", "route53", "coredns"]
---

Do you have records in a private hosted zone in Route53? Would you like your EKS pods to resolve these internal addresses? Good news—CoreDNS includes a Route53 plugin that enables just that! By configuring CoreDNS, you can seamlessly resolve Route53 records directly from within your Kubernetes cluster.

This guide walks you through enabling CoreDNS to use Route53 zones, allowing service discovery of AWS resources using private hosted zone records. If you already have a private hosted zone with records configured, this approach is simple, efficient, and highly effective.

## CoreDNS Route53 Plugin Overview

The CoreDNS Route53 plugin allows records from your Route53 hosted zones to be directly accessible from within your cluster. While there are various ways to handle service discovery for AWS resources, this plugin simplifies the process for clusters that rely on private DNS zones.

Once configured, the CoreDNS plugin queries the Route53 zones and makes the records available to pods within the EKS cluster. By default, CoreDNS pulls updates every 60 seconds, ensuring DNS records remain up-to-date.

## Configuration Steps

To enable the Route53 plugin in CoreDNS, you need to update the CoreDNS ConfigMap. This involves adding your Route53 hosted zone details to the `Corefile` section of the ConfigMap.

### CoreDNS Configuration

Below is an example of the configuration required:

```
<domain> {
  route53 <domain>.:<Hosted Zone ID>
}
```

Replace `<domain>` with your domain name and `<Hosted Zone ID>` with the ID of your Route53 private hosted zone.

### Updated ConfigMap Example

The modified ConfigMap should look similar to this:

```
apiVersion: v1
data:
  Corefile: |
    <domain> {
      route53 <domain>.:<Hosted Zone ID>
    }
    .:53 {
      errors
      health
      kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
      }
      prometheus :9153
      forward . /etc/resolv.conf
      cache 30
      loop
      reload
      loadbalance
    }
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
  labels:
    eks.amazonaws.com/component: coredns
    k8s-app: kube-dns
```

This configuration ensures that CoreDNS can resolve records from your Route53 hosted zone while maintaining its existing functionality for Kubernetes service discovery.

### IAM Permissions for CoreDNS

The CoreDNS Route53 plugin requires IAM permissions to read records from the Route53 hosted zone. Ensure your CoreDNS pods have the following permissions via an attached IAM role or service account:

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:GetHostedZone",
        "route53:ListHostedZones",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "*"
    }
  ]
}
```

You can attach these permissions to the IAM role associated with the CoreDNS pods. If you're using IRSA (IAM Roles for Service Accounts), ensure the role is properly configured.

### Verifying the Configuration

Once you've updated the ConfigMap and applied the necessary IAM permissions, restart the CoreDNS pods:

```
kubectl rollout restart deployment coredns -n kube-system
```

After the restart:

1. **Test DNS Resolution**: Use a pod within your cluster to resolve a record from your Route53 private hosted zone:

   ```
   nslookup <record>.<domain> <coredns-cluster-ip>
   ```

   Replace `<record>` and `<domain>` with a record in your hosted zone.

2. **Monitor CoreDNS Logs**: Check the CoreDNS pod logs for errors or to confirm that queries to Route53 are succeeding:

   ```
   kubectl logs -n kube-system -l k8s-app=kube-dns
   ```

### Troubleshooting

If your CoreDNS pods fail to restart after modifying the ConfigMap, it may be due to missing IAM permissions. Double-check the following:

- **IAM Role or Service Account**: Ensure the CoreDNS pods have the necessary permissions to access Route53.
- **ConfigMap Syntax**: Ensure there are no syntax errors in your ConfigMap.

## Additional Configuration Options

The CoreDNS Route53 plugin supports advanced configurations:

- **Explicit AWS Credentials**: You can explicitly define AWS credentials in the plugin configuration if the default credentials chain is insufficient.
- **Custom Polling Interval**: Modify the polling interval (default: 60 seconds) to suit your needs by adding the `ttl` option in the `Corefile`:

  ```
  <domain> {
    route53 <domain>.:<Hosted Zone ID> {
      ttl 120
    }
  }
  ```

For more details, refer to the [CoreDNS Route53 plugin documentation](https://coredns.io/plugins/route53/).

## Benefits of Using CoreDNS with Route53

- **Simple Integration**: No need for additional DNS servers or complex configurations.
- **Dynamic Updates**: DNS records from Route53 are refreshed automatically, ensuring pods have access to the latest records.
- **Seamless Service Discovery**: Pods can resolve internal addresses without relying on external services.
- **Native Kubernetes Support**: CoreDNS is already the default DNS service for Kubernetes, making this solution highly compatible.

## Conclusion

Enabling the CoreDNS Route53 plugin is a straightforward way to resolve private Route53 records from within your EKS cluster. By updating the CoreDNS ConfigMap and ensuring the correct IAM permissions, you can seamlessly integrate Route53 with Kubernetes, allowing for dynamic and reliable service discovery.

This simple yet powerful solution enhances the flexibility and functionality of your Kubernetes networking setup, enabling your applications to interact more effectively with AWS resources.
