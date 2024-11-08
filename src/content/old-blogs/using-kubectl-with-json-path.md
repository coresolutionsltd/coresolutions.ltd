Using Kubectl with JSON PATH

kubectl allows you to run commands against Kubernetes clusters. You can use kubectl to complete various actions, such as deploy applications, inspect and manage cluster resources, and view logs.

When working with large datasets JSON Path can be an invaluable tool on the command line. It allows us to view data in a human readable format which is normally out of sight via standard kubectl commands. The -o wide flag does give us some extra info but it still hides a lot. We could use the -o json flag to view the whole json object but instead we’ll look at how we can use the json output with JSON Path to view only the data we want.
JSON Path Examples

Below are some examples along with their output, note that the $. which identifies the root object in JSON Path is not mandatory as kubectl adds this automatically.

> kubectl get nodes -o jsonpath='{.items[*].metadata.name}'
kubemaster kubenode01 kubenode02

> kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.architecture}'
amd64 amd64 amd64

> kubectl get pods --all-namespaces -o jsonpath='{.items[*].spec.containers[*].image}'
gcr.io/google_containers/defaultbackend:1.4 grafana/grafana:6.1.6 quay.io/kubernetes-ingress-controller/nginx-ingress-controller:0.19.0 prom/prometheus:v2.3.2 k8s.gcr.io/coredns:1.7.0 k8s.gcr.io/coredns:1.7.0 k8s.gcr.io/etcd:3.4.13-0 k8s.gcr.io/kube-apiserver:v1.20.1 k8s.gcr.io/kube-controller-manager:v1.20.1 k8s.gcr.io/kube-proxy:v1.20.1 k8s.gcr.io/kube-proxy:v1.20.1 k8s.gcr.io/kube-proxy:v1.20.1 k8s.gcr.io/kube-scheduler:v1.20.1 docker.io/weaveworks/weave-kube:2.7.0 docker.io/weaveworks/weave-npc:2.7.0 docker.io/weaveworks/weave-kube:2.7.0 docker.io/weaveworks/weave-npc:2.7.0 docker.io/weaveworks/weave-kube:2.7.0 docker.io/weaveworks/weave-npc:2.7.0 kubernetesui/metrics-scraper:v1.0.4 kubernetesui/dashboard:v2.0.0

We can use multiple queries in a single kubectl command.

> kubectl get nodes -o jsonpath='{.items[*].metadata.name}{"\n"}{.items[*].status.nodeInfo.osImage}{"\n"}{.items[*].status.nodeInfo.architecture}'
kubemaster       kubenode01             kubenode02
Ubuntu 18.04.5 LTS Ubuntu 18.04.5 LTS Ubuntu 18.04.5 LTS
amd64              amd64                     amd64

We can also leverage range loops to iterate through items, the below loop extracts the same data as the above command but by using a range loop to iterate through all items.

> kubectl get nodes -o jsonpath='{range .items[*]} {.metadata.name}{"\t"}{.status.nodeInfo.osImage}{"\t"}{.status.nodeInfo.architecture}{"\n"}{end}' 
kubemaster    Ubuntu 18.04.5 LTS	  amd64
kubenode01   Ubuntu 18.04.5 LTS	  amd64
kubenode02   Ubuntu 18.04.5 LTS    amd64

Custom columns are the preferred approach when trying to achieve a similar query as above. Instead of adding the tabs and new lines ourselves the custom column option takes care of this for us, it also gives us fancy column headers! Depending on what you are trying to achieve it may be the easier route.

Custom columns are used via the -o custom-columns flag, columns are separated via commas.

>kubectl get nodes -o custom-columns=NODE:{.metadata.name},CPU:{.status.capacity.cpu},MEMORY:{.status.capacity.memory}
NODE             CPU   MEMORY
kubemaster    2       2040792Ki
kubenode01   2       2040792Ki
kubenode02   2       2040792Ki

> kubectl get pods --all-namespaces -o custom-columns=POD:{.metadata.name},IMAGE:{'.spec.containers[*].image'}
POD                                                                      IMAGE
default-http-backend-6475dbfd8-cx9rp                gcr.io/google_containers/defaultbackend:1.4
grafana-788768d748-dzz4m                                grafana/grafana:6.1.6
nginx-ingress-controller-54f79db697-djbvq          quay.io/kubernetes-ingress-controller/nginx-ingress-controller:0.19.0
prometheus-server-657c9f8644-dqz8l                  prom/prometheus:v2.3.2
coredns-74ff55c5b-dvdhp                                     k8s.gcr.io/coredns:1.7.0
coredns-74ff55c5b-sx9j8                                      k8s.gcr.io/coredns:1.7.0
etcd-kubemaster                                                  k8s.gcr.io/etcd:3.4.13-0
kube-apiserver-kubemaster                                  k8s.gcr.io/kube-apiserver:v1.20.1
kube-controller-manager-kubemaster                   k8s.gcr.io/kube-controller-manager:v1.20.1
kube-proxy-mx424                                                k8s.gcr.io/kube-proxy:v1.20.1
kube-proxy-rhsl6                                                   k8s.gcr.io/kube-proxy:v1.20.1
kube-proxy-ztzq2                                                  k8s.gcr.io/kube-proxy:v1.20.1
kube-scheduler-kubemaster                                 k8s.gcr.io/kube-scheduler:v1.20.1
weave-net-28wf7                                                 docker.io/weaveworks/weave-kube:2.7.0,docker.io/weaveworks/weave-npc:2.7.0
weave-net-d8vbs                                                 docker.io/weaveworks/weave-kube:2.7.0,docker.io/weaveworks/weave-npc:2.7.0
weave-net-xp6v7                                                 docker.io/weaveworks/weave-kube:2.7.0,docker.io/weaveworks/weave-npc:2.7.0
dashboard-metrics-scraper-7b59f7d4df-6blnh     kubernetesui/metrics-scraper:v1.0.4
kubernetes-dashboard-74d688b6bc-9pkbw         kubernetesui/dashboard:v2.0.0

    Note that the .items section is omitted, this is because custom columns will iterate through all items in the list as we did with our range loop.

Using kubectl with json path does have a few restrictions, On Windows, you must double quote any JSON Path query that contains spaces. Regex is not supported, if regex is needed you can pipe the json output to jq to achieve the desired results. Also, kubectl’s JSONPath parser can hit issues with dots in elements, when using custom columns escaping these should solve the issue.

Depending on your workflow and how you’re managing & monitoring your Kubernetes cluster, leveraging kubectl with json path may not grant much additional insight into your clusters. However knowing how to leverage these two tools together can be a tremendous help when you need to extract very specific information.
