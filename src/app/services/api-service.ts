import { Injectable } from '@angular/core';
import { RecordSide } from '../types';
import * as config from './config';
import * as util from './util';
import { ProgressObserver } from '../home';

@Injectable()
export class ApiService {

  private API_URL = "http://localhost:8060/";//"https://play-it-again.herokuapp.com/";

  postRecord(record: RecordSide) {
    return this.postJsonToApi('record', record);
  }

  private async postJsonToApi(path: string, json: {}, params?: {}): Promise<string> {
    path = this.addParams(path, params);
    const response = await fetch(this.API_URL+path, {
      method: 'post',
      body: JSON.stringify(json),
      headers: { 'Content-Type': 'application/json' }
    });
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async scpWavToAudioStore(path: string, observer: ProgressObserver): Promise<any> {
    observer.updateProgress("uploading files to audio store", 0);
    console.log('sshpass -p '+config.ftppassword+' scp -r '+path+' '+config.ftpusername+':');
    await util.execute('sshpass -p '+config.ftppassword+' scp -r '+path+' '+config.ftpusername+':');
  }

  /*private getJsonFromApi(path: string, params?: {}): Promise<any> {
    path = this.addParams(path, params);
    return fetch(this.API_URL+path)
      .then(r => r.text())
      .then(t => JSON.parse(t))
      .catch(e => console.log(e));
  }*/

  private addParams(path, params?: {}) {
    if (params) {
      let paramStrings = Array.from(Object.keys(params))
        .map(k => k+"="+encodeURIComponent(params[k]));
      path += '?'+paramStrings.join('&');
    }
    return path;
  }

}