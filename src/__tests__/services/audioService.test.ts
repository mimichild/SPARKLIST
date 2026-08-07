import { createAudioPlayer, __mockPlayer } from 'expo-audio';
import * as audioService from '../../services/audioService';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({ soundEnabled: true });
});

describe('audioService', () => {
  it('playFireworks 會建立音訊播放器並呼叫 play', () => {
    audioService.playFireworks();
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(__mockPlayer.play).toHaveBeenCalled();
  });

  it('playCheer 會建立音訊播放器並呼叫 play', () => {
    audioService.playCheer();
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(__mockPlayer.play).toHaveBeenCalled();
  });

  it('playApplause 會建立音訊播放器並呼叫 play', () => {
    audioService.playApplause();
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(__mockPlayer.play).toHaveBeenCalled();
  });

  describe('soundEnabled 為 false 時（使用者開啟「關閉音效」）', () => {
    beforeEach(() => {
      useAppStore.setState({ soundEnabled: false });
    });

    it('playFireworks 不會播放', () => {
      audioService.playFireworks();
      expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('playCheer 不會播放', () => {
      audioService.playCheer();
      expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('playApplause 不會播放', () => {
      audioService.playApplause();
      expect(createAudioPlayer).not.toHaveBeenCalled();
    });
  });
});
