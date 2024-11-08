Resolve Route53 Records From Within EKS

Do you have records in a Private Hosted Zone in Route53? Would you like to resolve those records within your EKS cluster, allowing your pods to resolve internal addresses? Well I have great news, CoreDNS provides a route53 plugin which can enable just that!

The CoreDNS Route53 plugin allows records from Route53 to be directly available from within your cluster. There are various ways in which you can handle service discovery of AWS resources. If you already have the Private Zone created with records present, then enabling CoreDNS to use Route53 Zones can be a neat solution.

Configuration is super simple! All you need to do is edit the CoreDNS config map and add your Route 53 hosted zone details to the Corefile section.

<domain> {
      route53 <domain>.:<Hosted Zone ID>
} 

The modified Config Map should resemble something like this:

# Please edit the object below. Lines beginning with a '#' will be ignored,
# and an empty file will abort the edit. If an error occurs while saving this file will be
# reopened with the relevant failures.
#
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
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","data":{"Corefile":".:53 {\n    errors\n    health\n    kubernetes cluster.local in-addr.arpa ip6.arpa {\n      pods insecure\n      fallthrough in-addr.arpa ip6.arpa\n    }\n    prometheu
s :9153\n    forward . /etc/resolv.conf\n    cache 30\n    loop\n    reload\n    loadbalance\n}\n"},"kind":"ConfigMap","metadata":{"annotations":{},"labels":{"eks.amazonaws.com/component":"coredns","k8s-app":"kube
-dns"},"name":"coredns","namespace":"kube-system"}}
  creationTimestamp: "2021-01-06T17:11:23Z"
  labels:
    eks.amazonaws.com/component: coredns
    k8s-app: kube-dns
  name: coredns
  namespace: kube-system
  resourceVersion: "179"
  selfLink: /api/v1/namespaces/kube-system/configmaps/coredns
  uid: d4c7f4c4-a5b1-457f-89e5-29b535bd10ce

The above example uses implicit AWS credentials. You’ll be able to explicitly define them and configure various settings. You can find more examples of this on the coredns plugin page.

Once the Config Map has been updated, you’ll be able to resolve records from the Route53 Hosted Zone directly from your pods within EKS. New records will be pulled in every 60 seconds by default.

If your CoreDNS pods fail to restart after modifying the ConfigMap, it might be due to IAM permissions, double check you are granting them the correct permissions to read from your Route53 zones.

This is super simple yet super effective when you need to resolve internal route53 records within your Kubernetes cluster!
