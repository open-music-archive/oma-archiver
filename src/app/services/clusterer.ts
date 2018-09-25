import * as clusterfck from 'clusterfck';
import { ApiService } from './api-service';
import { Clustering, Cluster, DbSoundObjectFeatures, DbClustering } from '../types';

const CLUSTER_LIMIT = null;// = 128;

export class Clusterer {

  private features: DbSoundObjectFeatures[];
  public vectors: number[][];

  constructor(private apiService: ApiService) {}

  async init() {
    this.features = await this.apiService.getFeatures();
    this.vectors = this.features.map(f => f.normalFeatures);
    console.log(this.vectors.length, this.vectors[0]);
  }

  /** clusterRatio is the proportional amount of clusters per sound object,
    * e.g. 0.1 is 1 cluster per 10 objects */
  cluster(clusterRatio: number): DbClustering {

    var clusterCount = Math.round(this.vectors.length*clusterRatio);
    if (CLUSTER_LIMIT) {
      clusterCount = Math.min(CLUSTER_LIMIT, clusterCount);
    }

    var kmeans = new clusterfck.Kmeans();
    const result: number[][][] = kmeans.cluster(this.vectors, clusterCount);
    //map vectors to object id
    const clusters = result.map(c => c.map(v => this.features[this.vectors.indexOf(v)]["_id"]));
    console.log("clustered " + this.vectors.length + " vectors into " + clusters.length + " clusters");
    const clusterObjects: Cluster[] = clusters.map((c,i) => ({index: i, signals: c, clusteringID: "" }));

    return {
      clustering: {
        features: ["all"],
        method: "kmeans",
        ratio: clusterRatio,
        size: clusterCount,
        centroids: kmeans.centroids
      },
      clusters: clusterObjects
    };
  }

}
