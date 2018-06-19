import { Injectable } from '@angular/core';
import { Fragment, ProgressObserver } from '../types';
import * as util from './util';

const CHUNKS_FOLDER = './chunks/';


@Injectable()
export class AudioService {

  async splitWavFile(input: string, fragments: Fragment[], observer: ProgressObserver) {
    observer.updateProgress("splitting audio files", 0);
    return Promise.all(fragments.map((f,i) => {
      const output = CHUNKS_FOLDER+util.getWavName(input)+'_'+i+'.wav';
      util.execute('sox '+input+' '+output+' trim '+f.time+' '+f.duration);
      observer.updateProgress("splitting audio files", (i+1)/fragments.length);
    }));
  }

}