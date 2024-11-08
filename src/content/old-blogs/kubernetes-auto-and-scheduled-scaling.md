Kubernetes Auto and Scheduled Scaling

Kubernetes AutoScaling allows us to automatically scale due to a surge in demand without over-provisioning our capacity. This lowers the cost of ownership, we can further lower the operational costs by leveraging additional strategies, such as AWS Spot instances.

How you scale your Kubernetes cluster will largely depend on how you are hosting Kubernetes. In this post, we’ll cover the generic tools used to auto scale nodes and pods. These tools, installations and use cases can be applied to all Kubernetes clusters. We’ll also focus on AWS / EKS specific approaches to best scale Kubernetes within the AWS Cloud. We’ll look at scheduled scaling in relation to Nodes and Pods and how this can best be used in conjunction with AutoScaling to built a robust scaling strategy.

Effective Kubernetes auto scaling requires coordination between both layers, the pod layer and the node layer. The Horizontal Pod AutoScaler (HPA) allows us to automatically scale our pods whilst the Cluster AutoScaler (CA) allow us to automatically scale the number of nodes in our cluster.
kubernetes autoscaling

    You can also scale your pod layer with the Vertical Pod AutoScaler. This increases the allocated CPU or Memory to existing pods.

Auto Scaling
Horizontal Pod AutoScaler (HPA)

The Horizontal Pod AutoScaler allows us to auto scale pods. HPA fetches metrics from a series of aggregated APIs, metrics, custom metrics and external metrics. The metrics-server is normally used for the metrics API, however, with the metrics server we can only scale on CPU or Memory. We can leverage the custom and external metric APIs to extend this and scale on practically any useful metric.

The HPA is a native API resource in Kubernetes. The current stable version currently only includes support for CPU autoscaling. The beta version includes support for scaling on memory, custom and external metrics.

Below is an example deployment with HPA configured so we can see it in action.

apiVersion: apps/v1
kind: Deployment
metadata:
  name: hpa-example
spec:
  selector:
    matchLabels:
      run: hpa-example
  replicas: 1
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

apiVersion: v1
kind: Service
metadata:
  name: hpa-example
  labels:
    run: hpa-example
spec:
  ports:
  - port: 80
  selector:
    run: hpa-example

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

You can achieve the same result as the above HorizontalPodAutoscaler with kubectl imperative commands.

kubectl autoscale deployment hpa-example --min=1 --max=10 --cpu-percent=50

This will create the HPA resource as above for the hpa-example deployment.

You should now have a deployment with an associated HPA running.

NAME               REFERENCE                         TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
hpa-example   Deployment/hpa-example   0%/50%    1                10                1                72s

If you’re HPA is failing to get resource metrics:

FailedGetResourceMetric the HPA was unable to compute the replica count: unable to get metrics for resource cpu: unable to fetch metrics from resource metrics API: the server is currently unable to handle the request (get pods.metrics.k8s.io)

Double check you have the metrics-server installed, if not, install the latest version with the below command.

kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

Now that we have an example deployment, service and HPA running. We’ll test scaling out the hpa-example pod by generating some CPU load.


Run the below command to generate some load on our hpa-example pods. Within a few moments you should see new pods starting to appear as the HPA starts to horizontally scale based on the CPU load.

kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh -c "while sleep 0.01; do wget -q -O- http://hpa-example; done"

Cluster AutoScaler (CA)

CA can be used to automatically scale nodes. There is two ways to deploy CA, the first is to manually set the ASG. The second is to auto discover ASGs based on tags.

If the scheduler is unable to schedule a pod on a node due to resource requirements, the CA will automatically spin up a new node. This process can take anywhere between a couple of minutes to 10~. When a new node is up and in a ready state, pods will automatically be scheduled on the new node. No manual intervention is required.

By default the CA scales down when a node is idle for 10 minutes. It does however respect the values set in the ASG so it will not go below the minimum value set. This is useful when combining CA with scheduled scaling of nodes.

In order for the Cluster Autoscaler to run successfully, you’ll need to have the correct IAM policy/Role created and attached to a ServiceAccount. This will allow you to use the OIDC provider to grant the autoscaler pods the correct permissions to modify your ASGs. You could attach these permissions directly to the worker nodes, but that will allow any pods running on your nodes to modify your ASGs.
Helm Installation

helm repo add autoscaler https://kubernetes.github.io/autoscaler

Method 1 – Using Autodiscovery

helm install autoscaler autoscaler/cluster-autoscaler --set awsRegion=eu-west-1 --set "autoDiscovery.clusterName=<Cluster Name>" --set rbac.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::<AWS Account ID>:role/<CA Role>

In order to allow Custer AutoScaler to Auto Discover your ASGs you must tag them appropriately

k8s.io/cluster-autoscaler/<cluster-name> 	owned
k8s.io/cluster-autoscaler/enabled TRUE

Method 2 – Specifying groups manually

helm install autoscaler autoscaler/cluster-autoscaler --set "autoscalingGroups[0].name=<Cluster ASG>" --set "autoscalingGroups[0].maxSize=3" --set "autoscalingGroups[0].minSize=1" --set awsRegion=eu-west-1 --set rbac.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::<AWS Account ID>:role/<CA Role>

Once installed, CA checks whether there are any pending pods and increases the size of the cluster if more resources are needed and if the scaled up cluster is still within the user-provided constraints. CA interfaces with the cloud provider to request more nodes or deallocate idle nodes.

You should now be able to scale the HPA example above to force the CA to scale out your cluster. When using CA and HPA together, nodes will be automatically added as pods autoscale and require more resource.
Scheduled Scaling

Scheduled scaling can be done within the pod or node layers. If leveraging pod and node autoscaling, there would be no need to set schedules in both. If we go the pod route, the nodes will auto scale thanks to the CA. In contrast, if we go the node route, we would need to rely on HPA to autoscale the pods. As we will have the node resource in place, scaling events would be immediate without the lag when scaling out nodes. Using both AutoScaling and Scheduled scaling allows us to prepare for known peaks as well as adapt to unknown peaks and troughs.
Pods

You can manually scale your deployments with the scale command

kubectl scale --replicas=5 deployment/hpa-example

What if you have a known peak period and would like to schedule this scale out to cope with the known higher demand?

Native scheduling of pods isn’t supported. The optimum way to achieve scheduled scaling of pods is via kube-schedule-scaler. This allows us to add annotations to deployments with set cron like schedules of when to scale. An example annotation is below:

zalando.org/schedule-actions: |
      [
        {"schedule": "00 14 * * Mon-Fri", "minReplicas": "4", "maxReplicas": "10"},
        {"schedule": "00 22 * * Mon-Fri", "minReplicas": "2", "maxReplicas": "10"}
      ]

We can use this in tandem with HPA, allowing us to set the minimum replica count at set schedules. HPA will then scale to this min value and further autoscale to the max value if required. When scaling down, the schedule will again decrease the minimum value, letting the HPA scale down to that value is appropriate. If HPA is not in use, we could just set the the replica count for the deployment

zalando.org/schedule-actions: |
      [
        {"schedule": "0 7 * * Mon-Fri", "replicas": "1"},	
      ]

An alternative approach would be to leverage CronJob resources in Kubernetes to schedule your pods.

The following example would scale the nginx deployment to 3 replicas every day at 8am. The problem with this approach is that each service will require its own CronJob for each scale event.

apiVersion: batch/v2alpha1
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
            image: siji/kubectl:v1.5.2
            command:
            - kubectl.sh
            - kubectl
            - scale
            - --replicas=3
            - deployment/nginx
          restartPolicy: OnFailure

Pods

Creating schedules for your nodes to scale can mitigate the time nodes take to come into service. Manually scaling prior to a known peak can mitigate the lag of a pending pod to a running pod when waiting for a node to become ready.

How you are hosting our Kubernetes cluster will determine how best to schedule nodes to scale. If leveraging AWS, you can simply add scheduled scaling policies to the worker nodes Auto Scaling Groups (ASGs).

We can set the schedules so scaling down of nodes won’t actively terminate a node. We would just lower the minimum ASG value and allow the termination of idle nodes to be taken care of by the Cluster AutoScaler.
Conclusion

Kubernetes has some great scaling functionality natively available. We can supplement this to create a robust scaling strategy. The strategy you adopt will depend on the type of traffic and the services running. Leveraging the Cluster AutoScaler and Horizontal Pod AutoScalers will allow you to dynamically scale each layer of your Kubernetes cluster independently without any manual intervention. Scheduled scaling still has it’s place and allows you preemptively scale before known peaks. This is helpful to mitigate any service degradation due to node scaling.

Designing, Testing and Implementing the correct Kubernetes scaling strategy can be a difficult task. If you have any questions or would like to discuss anything mentioned, please do not hesitate to get in touch.
