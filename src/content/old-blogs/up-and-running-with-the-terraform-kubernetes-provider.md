Up and running with the Terraform Kubernetes Provider

The Terraform Kubernetes provider is used to create resources within Kubernetes. Once the provider is configured, you can provision and manage Kubernetes resources with Terraform as you would any other service.

The main benefit is the simplified management by using the same tool to provision Kubernetes infrastructure and deploy applications. Another nice benefit is that you also get drift detection out of the box as Terraform plans will always present you with the differences.

Converting YAML to Terraform isn’t a trivial job and can be a little time consuming. If you’re using Terraform for all of your infrastructure as code and are just starting to build out your Kubernetes resources, you should definitely evaluate it.
Setup

First, the provider needs configuring with credentials before use. The simplest configuration is to specify the kubeconfig path.

provider "kubernetes" {
  config_path = "~/.kube/config"
}

Another configuration option is to statically define TLS certificate credentials.

provider "kubernetes" {
  host = "https://192.168.43.5"

  client_certificate     = "${file("~/.kube/client-cert.pem")}"
  client_key             = "${file("~/.kube/client-key.pem")}"
  cluster_ca_certificate = "${file("~/.kube/cluster-ca-cert.pem")}"
}

You could also use an OAuth token.

data "aws_eks_cluster" "example" {
  name = "example"
}

data "aws_eks_cluster_auth" "example" {
  name = "example"
}

provider "kubernetes" {
  host                          = data.aws_eks_cluster.example.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.example.certificate_authority[0].data)
  token                        = data.aws_eks_cluster_auth.example.token
  load_config_file         = false
}

Resources

Now that we have the provider configured to our desired Kubernetes cluster, lets create some resources.

resource "kubernetes_namespace" "nginx" {
  metadata {
    annotations = {
      name = "nginx"
    }

    labels = {
      mylabel = "nginx"
    }

    name = "nginx"
  }
}

A Deployment ensures that a specified number of pod replicas are running. The below example creates a deployment with 3 replicas specified in the nginx namespace we defined above.

resource "kubernetes_deployment" "deployment-example" {
  metadata {
    name = "deployment-example"
    namespace = "nginx"
    labels = {
      test = "Example"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        test = "Example"
      }
    }

    template {
      metadata {
        labels = {
          test = "Example"
        }
      }

      spec {
        container {
          image = "nginx:1.19.7"
          name  = "example"

          resources {
            limits = {
              cpu    = "0.5"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "50Mi"
            }
          }
        }
      }
    }
  }
}

We could then create an Horizontal Pod Autoscaler to auto scale the above deployment based on CPU metrics by leveraging the kubernetes_horizontal_pod_autoscaler. The below example will create an HPA for the above deployment.

resource "kubernetes_horizontal_pod_autoscaler" "hpa-example" {
  metadata {
    name = "hpa-example"
  }

  spec {
    max_replicas                                  = 10
    min_replicas                                   = 3
    target_cpu_utilization_percentage = 60

    scale_target_ref {
      kind = "Deployment"
      name = "deployment-example"
    }
  }
}

    By default, the provider ignores any annotations whose key names end with kubernetes.io.

If you are familiar with Terraform, the above examples will look like any other resource you’ve created in the past, that’s the beauty of the Kubernetes provider. Theres no new syntax to learn and you can also use your existing Terraform pipelines to manage your Kubernetes resources.
Conclusion

You can use the Terraform Kubernetes Provider to manage your Kubernetes resources, enabling a single coherent code base to deploy all of the infrastructure and all of the Kubernetes resources required to run your applications. Anyone with Terraform experience and working with Kubernetes can appreciate this, however it’s not the optimum solution for all circumstances.
