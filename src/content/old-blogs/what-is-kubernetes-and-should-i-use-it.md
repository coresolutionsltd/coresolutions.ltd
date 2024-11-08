What Is Kubernetes and Should I Use It?

In this post we dive into what exactly Kubernetes does and how it can improve how you build, deploy and manage your applications. We dive into the various components and how they can help when running containers. We also explore the various benefits this type of infrastructure can provide compared to traditional software platforms and touch on some real world examples.
So What Exactly Is Kubernetes?

Kubernetes is a powerful open source platform that co-ordinates the management, deploying and scaling of container oriented workloads. It provides you with a framework to completely manage the life-cycle of container applications resiliently, as well as a unified approach to managing your applications across teams. It’s often hosted in a cloud environment but also run on bare metal.

Google open-sourced the Kubernetes project in 2014. It is a descendant of Borg, a container orchestration platform used internally at Google.

With Kubernetes you define your applications in JSON or YAML. You can perform rolling updates whilst automatically scaling your pods and nodes to give you a degree of flexibility.

Kubernetes is a perfect match for micro-services. It handles most of the operational requirements one needs for running container applications. The most significant are: container deployment, persistent storage, health monitoring, resource management, auto-scaling and high availability.
What Are Containers?

In order to understand what Kubernetes is we first need to understand what containers are and why they are so popular. Traditionally applications ran on physical servers. This required infrastructure teams planning new hardware purchases, racking and configuring the bare-metal servers well in advance in order to extend an applications resources. This approach simply doesn’t scale, the lead time from purchasing new hardware to running applications can take months, you also need to over provision to enable room for growth so resource waste is guaranteed.

Virtual machines are instances that are abstracted from the hardware. By leveraging virtual machines, you can run multiple instances on a single piece of hardware. Each virtual machine runs its own Operating System, the hypervisor on the host allows each virtual machine to share the hosts resources in a secure, isolated fashion.

Containers then takes this abstraction one step further, in addition to sharing the underlying hardware, they share the Operating Systems kernel as well. This allows containers to be extremely lightweight, the Alpine Linux image with a complete package index is only 5 MB in size. Containers are extremely portable, and having everything required to run your application within the container means you can run anywhere and it will behave exactly the same.
Kubernetes Architecture

Kubernetes brings together individual machines into a cluster, this cluster is the platform where all Kubernetes components are configured. The worker nodes within the cluster runs applications whilst the control plane manages the worker nodes and their workloads.

A Kubernetes cluster consists of at least a single node, nodes are responsible for hosting and running pods.

A node receives instructions from the control plane, the node then creates or destroys containers accordingly. All decision making is done within the control plane, nodes simply follow orders.

Typically traffic comes into a cluster via an Ingress Controller. However, services can be exposed directly. Ingress Controllers are not created automatically with a cluster, they need to be picked and installed depending on your requirements. They allow us to define a set of rules which determines if traffic is permitted into the cluster and how it should be routed. Ingress Controllers can also modify requests and provide additional useful functionality.
Control Plane Components

The control plane manages the resources within the cluster. In production environments, the control plane usually runs across multiple nodes, providing fault-tolerance and high availability. Below is a quick overview of all of the components that make up the control plane.
kube-apiserver

This is arguably the most important component of the entire cluster as it allows Kubernetes’ workloads to be configured. The kube-apiserver implements a RESTful interface, this allows various different tools and libraries to interact with it. kubectl can be used to directly interact with the API server via the CLI.
etcd

Kubernetes uses etcd to store key-value data regarding the configuration of the cluster. It can span multiple nodes to enable high-availability.
kube-scheduler

The scheduler is responsible for scheduling pods onto available nodes. It examines the workloads resource requests and places the workload on an acceptable node. The scheduler tracks the resource availability on all nodes.
kube-controller-manager

The controller manager runs various processes that control different aspects of the cluster. These are all combined into a single binary for simplicity. They regulate the state of the cluster, perform routine tasks and manage workload life cycles.

The node controller is responsible for noticing and responding when nodes go down whilst the job controller watches for Job objects that represent one-off tasks. It then creates Pods to run those tasks.
cloud-controller-manager

Cloud controller manager allows Kubernetes to interact with different cloud providers. This allows Kubernetes to natively create cloud services with no additional resource definitions. A LoadBalancer service for example will spin up a corresponding loadbalancer in your cloud environment, annotations could then be used within the service itself to customise the cloud resource.
Node Components

Nodes perform work by running containers, there are a few components required for each node to enable them to achieve this.
kubelet

A small agent that ensures all containers are running in their desired state on a particular node. The kubelet relays information to and from the control plane, it also communicates with etcd to read and write values to reflect the current state.
kube-proxy

In order to make resources available to other components the kube-proxy is ran on each node. This enables network communication. There are two modes, userspace and iptables. Iptables is the latest default mode, it requires less overhead than usermode. It changes iptables NAT in linux to achieve TCP and UDP routing across all containers.
Container runtime

The container runtime is responsible for the running of containers, Kubernetes supports several container runtimes, Docker, containerd, CRI-O, and any implementation of the Kubernetes CRI (Container Runtime Interface).
Kubernetes Objects

Kubernetes leverages additional layers of abstraction to provide excellent scaling, fault tolerance and life cycle management features. With Kubernetes you don’t manage containers directly, instead you define and create resources that take care of managing the workload. Below is a list of the main objects used to run almost any workload. We will give a brief description of each one as well touch as how they interact with each other.
Pods

Containers themselves are not assigned to hosts. Instead, one or more containers are encapsulated in an object called a Pod. They are the smallest deploy-able unit in Kubernetes. All containers within a single Pod share the same application lifecycle.

Pods usually consist of a main container that completes the primary purpose of the workload and optionally some sidecar containers to provide additional functions. A perfect example of this is to enable centralised logging. The main application container can just log to stdout, whilst sidecar container forwards all logs to a central logging service.

Users rarely manage pods themselves as they do not provide the features typically required in the applications life cycle. Instead they work with higher level objects that leverage pods. The most common approach to manage Pods is to create a Deployment resource which leverages ReplicaSets.
Namespaces

Namespaces provide isolation within a cluster. They are useful when multiple teams or projects are using the same cluster. Some resources do not belong to any single namespace. By default there are three namespaces: default, kube-system and kube-public.
ReplicaSets

Typically when working with Kubernetes you will require a stable fleet of Pods that can be horizontally scaled, this is where ReplicaSets comes into play.

By default Pods are not self-healing, a ReplicaSet ensures that a specified number of Pods are running. However, they do not provide any functionality to complete updates. A Deployment is a higher-level construct that manages ReplicaSets. As with Pods, ReplicaSets are rarely used directly.
StatefulSets

StatefulSets are helpful when deploying stateful applications, they contain a persistent bond between a Pod in the set and their PersistentVolume.

They give additional guarantees regarding ordering and uniqueness. When scaling Pods, StatefulSets perform operations in order, likewise when terminating Pods they complete the actions in reverse order. This can be useful for stateful applications as it enables greater predictability and control.

StatefulSets also provide a stable networking identifier, they create a unique name for each Pod that persists even if scheduled to another node.
DaemonSets

A DaemonSet ensures that Nodes are running a specified Pod. This is useful when deploying Pods that help perform maintenance or provide services at the Node level.

Whilst its perfectly acceptable to run daemon processes directly on Nodes by other means there are a few advantages when leveraging DaemonSets. Such as the ability to monitor and manage daemons in the same way as all other workloads.
Deployments

Deployments are the most common workloads within Kubernetes, they build on top of ReplicaSets and provide useful functionality when managing applications.

They’re designed to simplify the life cycle management of Pods. Deployments can be updated and Kubernetes will complete rolling updates to the Pods, manage the transition to the updated version and provide rollback functionality to quickly rollback to the previous version if any issues are detected.
Services

Services are basic load balancers used to distribute load to a logical set of Pods. By default, services are created as the ClusterIP type. These allow internal cluster traffic to use the Service. They can accept external traffic by leveraging either a NodePort or LoadBalancer service.

A Service doesn’t care how Pods are created, as long as the selector label matches it will route traffic to the desired Pods. This allows Pods to be created in multiple ways and still back a particular service.

The NodePort configuration is done by opening a static port on each Node’s external interface. Traffic to the external port is then routed to the appropriate pods via the Service.

A LoadBalancer service type will create an external load balancer to the cluster that can route traffic to the service. The creation of the load balancer is done via the cloud controller manager. The load balancer can be configured via annotations on the service, for example whether it’s external or internal facing or if it’s an Application Load Balancer or a Network Load Balancer.
CronJobs

A CronJob creates a schedule to run Jobs. Jobs provide a task-based workflow where containers are expected complete. Jobs are extremely useful when you need to perform one-off tasks.
Volumes and Persistent Volumes

Volumes decouples the storage from the Container. Its lifecycle is coupled to the Pod. It enables sharing of data between containers within a pod, however, when a Pod is terminated, the associated volume is destroyed.

Persistent Volume decouples the storage from the Pod. Its lifecycle is independent of the Pod itself. It enables sharing of data between pods.

Kubernetes supports multiple mechanisms to create Persistent Volumes. For example, AWS EBS or GCP Persistent disks. You can dynamically provision persistent volumes by defining a StorageClass, you then create a PersistentVolumeClaim with the StorageClass which requests the PersistentVolume to be automatically provisioned.
ConfigMaps and Secrets

ConfigMaps allow us to inject configuration data into Pods. Secrets can also achieve this but is intended for sensitive data where ConfigMaps are intended for all other insensitive configuration data. They can both be based on a file, directory or literal value.

ConfigMaps and Secrets can be used as a Volume within the container or injected into the containers environment variables.

You can also integrate Secret objects with secret management systems like AWS Secrets Manager, HashiCorp Vault, Google Secrets Manager and Azure Key Vault by leveraging the External Secrets Operator which extends Kubernetes with Custom Resources.

    A custom resource extends the Kubernetes API with functionality that isn’t available in the default installation.

Labels and Annotations

Both labels and annotations are mechanisms to attach metadata to objects. Labels are used in conjunction with selectors to identify resources. They are designed to specify useful, identifying information to the object.

Annotations attach metadata that isn’t used to identify and select objects. Annotations are flexible and can contain small or large, structured or unstructured data.
How Does Kubernetes Help Run My Containers?

Kubernetes enables you to achieve unparalleled power and flexibility, their robust feature set is unmatched in the open source world. The building blocks we’ve discussed allow you to develop systems that fully leverage the capabilities of the platform to run and manage your workloads resiliently at global scale.

The rich feature set allows us to change the state of our application with a safe and controlled approach. Secret and config management is also made easy with Kubernetes. It allows us to deploy and update secrets and application config without needing to rebuild container images or exposing secrets.

Kubernetes integrates extremely well with most cloud providers. This allows us leverage various cloud services to enhance how we manage and operate our clusters and workloads. We can also extend functionality to grant Kubernetes various capabilities that are made possible with third party services.
Should I Use It?

It’s more of a question of why shouldn’t you be using it. The benefits of leveraging Kubernetes are vast. With every single Kubernetes migration we complete it really is clear to see why it’s the most popular container orchestration solution on the planet. Kubernetes can handle even the most bespoke requirement, there are however a few situations where it might not be the perfect fit.

Kubernetes can run monolithic application surprisingly well, but not all monolithic applications are well suited. Containers need to be treated as cattle, if you have application servers you need to treat as pets this is a clear indication they wouldn’t fit well in the Kubernetes ecosystem.
Conclusion

If Kubernetes is new to your organisation then the initial learning curve might be high, but it will almost certainly be worth it. It will enable you to fully standardise your security, deployment and compute practices whilst enhancing your DevOps initiatives.

There’s a lot to think about when implementing Kubernetes, feel free to reach out with any questions or just for a quick chat to pick our brains with anything Kubernetes related.
