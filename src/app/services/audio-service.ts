import { Injectable } from '@angular/core';
import * as uuidv4 from 'uuid/v4';
import { SoundObject } from '../types';
import { ProgressObserver } from '../home';
import * as util from './util';
import * as constants from '../constants';

@Injectable()
export class AudioService {

  async resampleWavFile(infile: string, rate: number) {
    const outfile = infile.replace('.wav',' ')+rate+'.wav';
    //await util.execute('sox "'+infile+'" -r '+rate+' "'+outfile+'"');
    await util.execute('sox "'+infile+'" -G -b 16 "'+outfile+'" rate -v -L '+rate+' dither');
    return outfile;
  }

  async convertWavToFlac(infile: string, del = false) {
    const outfile = infile.replace('.wav','.flac');
    if (del == true){
      await util.execute('flac --delete-input-file --best "'+infile+'"');
    } else {
      await util.execute('flac --best "'+infile+'"');
    }
    return outfile;
  }

  splitWavFile(input: string, sideuid: string, fragments: SoundObject[], observer: ProgressObserver): Promise<string[]> {
    observer.updateProgress("splitting audio files", 0);
    return util.mapSeries(fragments, (async (f,i) => {
      const output = await this.trim(input, sideuid, f);
      observer.updateProgress("splitting audio files", (i+1)/fragments.length);
      return output;
    }));
  }

  private async trim(infile: string, sideuid: string, object: SoundObject): Promise<string> {
    const outfile = constants.SOUND_OBJECTS_FOLDER+sideuid+'/'+uuidv4()+'.wav';
    await util.execute('sox "'+infile+'" '+outfile+' trim '+object.time+' '+object.duration)
    return outfile;
  }

}