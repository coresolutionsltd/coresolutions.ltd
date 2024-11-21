Kubernetes AWS Load Balancer Controller

The AWS Load Balancer Controller (previously ALB Ingress Controller) natively integrates with AWS Application Load Balancers and Network Load Balancers. This allows you to leverage these resources to route traffic into your Kubernetes cluster.

If you’re running Kubernetes on AWS and like the idea of having your ingress controller natively integrated into AWS load balancing resources, then evaluating the AWS LoadBalancer Controller makes perfect sense. You can benefit from all of the elasticity and redundancy thats baked into these services by default.

The AWS Load Balancer Controller supports ingress grouping. This allows you to reduce costs by sharing a single ALB across multiple services.

The Ingress controller doesn’t get automatically updated after installation, any upgrades will need to be applied using your own deployment process.
Overview

The following diagram demonstrates the route ingress traffic takes from the ALB to the Kubernetes cluster via Target Groups.
Installation

The below installation process can also be done using Service Accounts instead of attaching IAM permisisons to the worker nodes. I’ve gone this route as I’m not leveraging Fargate and it feels like a nicer solution to allow Kubernetes the correct IAM permissions when working with worker nodes.

    Create IAM policy with the following permissions and attach to your worker nodes IAM role:
    https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/main/docs/install/iam_policy.json

    Add the EKS repository to Helm:

helm repo add eks https://aws.github.io/eks-charts

    Install the TargetGroupBinding CRDs

kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

    Install the AWS Load Balancer controller

helm install ingress eks/aws-load-balancer-controller -n kube-system --set clusterName=<cluster-name>

    The Load balancer resources will get created after you create ingress resources.

Ingress

Ingress exposes routes from outside the cluster to services within the cluster. When using the AWS Load Balancer Controller Ingress resources will create either an ALB or NLB depending on the ingress.class.

By default each ingress resource will create an associated ALB. You can force rules to remain within a single ALB by using the group.name annotation.

An example ingress resource that will create a public ALB can be seen below. Because the subnet annotation is omitted, a subnet will need to be present with the correct tags for it to be auto discovered. See below for a list of the required tags.

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
rules: - http:
paths: - path: "/"
backend:
serviceName: echoserver
servicePort: 80

If you hit the following error when creating a new Ingress resource and the rule isn’t appearing in your ALB:

Failed deploy model due to InvalidParameter: 1 validation error(s) found. - minimum field value of 1, CreateTargetGroupInput.Port

Double check the service and make sure it’s using NodePort. Other Ingress controllers are happy with ClusterIPs but the AWS Load Balancer Controller requires NodePorts.
Ingress Annotations

You can find a full list of available annotations here. See below for a list of annotations required to get you up and running.

    alb.ingress.kubernetes.io/group.name
    Controls whether rules are to remain within an ALB. If omitted, a new load balancer will be created for each Ingress.

    alb.ingress.kubernetes.io/security-groups
    The security-groups annotation specifies the security groups you want to attach to LoadBalancer. If this is omitted, one will be created allowing access from inbound-cidrs.

    alb.ingress.kubernetes.io/subnets
    Subnets to be used by the load balancer. If this is omitted, the AWS Load Balancer Controller can auto discover subnets based on certain tags. You must include the following tags to enable auto discovery of the subnet.
        kubernetes.io/cluster/<cluster-name>: owned
        kubernetes.io/role/internal-elb: should be set to 1 for internal load balancers.
        kubernetes.io/role/elb: should be set to 1 for internet-facing load balancers.

Testing

To test the AWS Load Balancer Controller is behaving as expected, you can deploy the echo server using the below commands. If you then use the ingress example above, you should be able to hit the ALB which should route your request to the k8s echoserv target group. This will, in turn, route to the echoserver service/pod.

kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.0.0/docs/examples/echoservice/echoserver-namespace.yaml &&\
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.0.0/docs/examples/echoservice/echoserver-service.yaml &&\
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.0.0/docs/examples/echoservice/echoserver-deployment.yaml

Considerations

Functionality of the AWS Load Balancer Controller aligns with the functionality of AWS load balancing. You need to ensure the functionality you require is possible with these services. For example, ALB path rules are exact, this means the Ingress pathType isn’t honoured. To overcome this, wildcards can be used in the path within the Ingress resource.

Another thing to note is that URL Rewrite rules aren’t natively supported as they are with other Ingress Controllers. You can use actions to complete redirects but not implement complex (or even basic) rewrite rules.
Conclusion

If your needs align with the current ALB/NLB functionality and like the idea of having an AWS native ingress controller which uses AWS Load Balancers to route traffic to your cluster, the AWS LoadBalancer Controller might be the perfect match. However if you have requirements beyond the scope of functionality offered by these native AWS resources you may benefit from looking at a more mature alternative.
