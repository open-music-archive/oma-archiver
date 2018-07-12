import * as clusterfck from 'clusterfck';
import { ApiService } from './api-service';
import { Clustering, Cluster } from '../types';

const CLUSTER_LIMIT = null;// = 128;

export class Clusterer {

  constructor(private apiService: ApiService) {}

  /** clusterRatio is the proportional amount of clusters per sound object,
    * e.g. 0.1 is 1 cluster per 10 objects */
  async cluster(clusterRatio: number): Promise<Clustering> {
    const features = await this.apiService.getFeatures();
    const vectors = features.map(f => f.normalFeatures);
    console.log(vectors.length, vectors[0]);

    var clusterCount = Math.round(vectors.length*clusterRatio);
    if (CLUSTER_LIMIT) {
      clusterCount = Math.min(CLUSTER_LIMIT, clusterCount);
    }

    var kmeans = new clusterfck.Kmeans();
    const result: number[][][] = kmeans.cluster(vectors, clusterCount);
    //map vectors to object id
    const clusters = result.map(c => c.map(v => features[vectors.indexOf(v)]["_id"]));
    console.log("clustered " + vectors.length + " vectors into " + clusters.length + " clusters");
    const clusterObjects: Cluster[] = clusters.map((c,i) =>
      ({name: i.toString(), signals: c, centroid: kmeans.centroids[i]}));

    return {
      features: ["all"],
      method: "kmeans",
      clusters: clusterObjects
    };
  }

}