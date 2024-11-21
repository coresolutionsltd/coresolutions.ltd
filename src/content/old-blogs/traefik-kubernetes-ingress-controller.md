Traefik Kubernetes Ingress Controller

So why might you be considering configuring a Traefik Kubernetes Ingress Controller? Well, Traefik provides a few features straight out of the box which are simply a joy to use. It’s simple to setup and maintain plus it handles the most demanding production environments.

Auto service discovery allows newly deployed services to be automatically added to the Traefik config, routes for destroyed services are auto deleted. After auto service discovery is setup it really does just work!

In this post, we’ll break down the various Traefik components at a very high level, go over the installation process using Helm, setup a hello world application and enable the Traefik dashboard.

We’ve added a few solutions to issues we’ve hit along the way. However, this isn’t a runbook on how to setup a production ready Traefik Kubernetes Ingress Controller or even how to best setup and manage Traefik in general. It’s to help spin up Traefik as fast as possible for evaluation purposes only.
Traefik Components:

    Providers – Discover the services that live on your infrastructure
    Entrypoints – Listen for incoming traffic on the specified port
    Routers – Analyses requests then connects them to the relevant service
    Services – Forward the request to your actual services
    Middlewares – Update the request or make decisions based on the request

Traefik configuration are in two camps. Theres the static startup camp, where providers and entrypoints live. Then theres the dynamic camp, where configuration is pulled from providers and defines how live requests are handled.

Dynamic configuration can change seamlessly without any interruption or downtime. Static config can also be loaded in different ways depending on how you install and manage Traefik.

Requests can be amended using middlewares. They attach to routers, and can tweak the requests to and from your services. They can complete various actions including redirection, add authentication, add or remove headers and so on.
Installation

There are various ways to install Traefik, this would all depend on how you are managing and deploying to Kubernetes.

You could leverage the Configuration Examples given here to deploy Traefik using YAML with kubectl. You could use the Kubernetes Terraform Provider to create the required resources. If you’re already familiar with Terraform and are using it to deploy your kubernetes infrastructure, this makes sense as you could also leverage the same CI/CD pipelines to deploy your kubernetes resources.

The quickest way to get started is via Helm.

Assuming you have kubectl configured for the cluster you wish to install Traefik to, the below commands will do just that.

helm repo add traefik https://helm.traefik.io/traefik
helm repo update
helm install traefik traefik/traefik

    Helm creates LoadBalancer service for traefik, if deploying locally you will need to setup MetalLB.

If you’re deploying to EKS, theres a few specific things you need to do to get the load balancer to create. You can find the user guide on load balancing with EKS here.

Firstly, specific tags will be required on the subnet you’re using. This will be different depending on the type of subnet:

    kubernetes.io/cluster/<clustername>: owned
    kubernetes.io/role/internal-elb: 1

    A public subnet would require: kubernetes.io/role/elb: 1

Annotations are also required to allow EKS to auto create the load balancer in a private subnet. The below annotations would create a Network Load Balancer in a private subnet.

annotations: {
service.beta.kubernetes.io/aws-load-balancer-type: nlb,
service.beta.kubernetes.io/aws-load-balancer-internal: "true"
}

Depending how you install Traefik will also determine how you can add these. If installing via Helm you can add them on the cli during the installation or by creating a values.yml and passing it in with the -f option helm install traefik traefik/traefik -f values.yml.

    Default values: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml

Hello Traefik

Now we have Traefik installed we can deploy a new workload to our cluster to test connectivity. Lets start with the whoami image.

apiVersion: v1
kind: Pod
metadata:
name: whoami
namespace: default
labels:
app: whoami
spec:
containers: - name: whoami
image: containous/whoami:latest
ports: - containerPort: 80

We’ve got a pod, now we just need a service!

apiVersion: v1
kind: Service
metadata:
name: whoami
namespace: default
spec:
ports: - port: 80
protocol: TCP
targetPort: 80
selector:
app: whoami
type: ClusterIP

Now our whoami pod is in a running state with an accompanying service, we can create an ingress route which defines the entrypoints it should be using along with the routes.

apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
name: whoami
namespace: default

spec:
entryPoints: - web

routes:

- match: PathPrefix(`/hello`)
  kind: Rule
  services:
  - name: whoami
    port: 80

Any requests coming through the loadbalancer on the web entrypoint / port with the path prefix of /hello will now be routed through Traefik to the whoami service/pods. ?

Suppose our backend service isn’t expecting the request to contain the path /hello, lets assume the whoami image is expecting /, the /hello request would then result in a 404. If we wanted to strip the prefix from the request we would need to use the StripPrefix Middleware.

We just need to define the Middleware and update the IngressRoute to use said Middleware.

apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
name: stripprefix
spec:
stripPrefix:
prefixes: - /hello

apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
name: whoami
namespace: default

spec:
entryPoints: - web

routes:

- match: PathPrefix(`/hello`)
  kind: Rule
  services:
  - name: whoami
    port: 80
    middlewares:
    - name: stripprefix

The above example routes requests from /hello to the whoami service, however this time it removes /hello from the path.
Traefik Dashboard

There are two methods to install the Traefik Dashboard, the quickest is the insecure route. To enable the insecure traefik dashboard, use the following Traefik options. If you’re installing via helm, you’ll need to add this into your values.yml.

api:
dashboard: true
insecure: true

We’ll need an IngressRoute to allow access from the web entrypoint.

apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
name: dashboard
spec:
entryPoints: - web
routes: - match: (PathPrefix(`/dashboard`) || PathPrefix(`/api`))
kind: Rule
services: - name: api@internal
kind: TraefikService

    Both /dashboard & /api PathPrefixes are required

You should then be able to access the Traefik dashboard with the loadbalancer address followed by /dashboard/ (the trailing slash is mandatory) – The port would depend on the entrypoint used. In the example above we’re using the web entrypoint, so no port is required. However this would expose the dashboard to everyone who can access the loadbalancer on port 80! If you use the traefik entrypoint, you’ll need to ensure it’s exposed and accessible.
traefik dashboard

As mentioned, this is fine for testing. However, anything else should be exposed securely or accessed via kubectl port-forward.

    The above setup will not provide a production ready Traefik Kubernetes Ingress Controller. It’s only for testing and evaluation purposes.

Next Steps

Deploy some pods, create some ingress routes, play with middlewares, scrape some metrics, create some dashboards from said metrics in your favorite dash-boarding application, commit configurations to source control, deploy through to production… Enjoy!
