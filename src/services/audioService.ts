import { createAudioPlayer } from 'expo-audio';

const fireworksSource = require('../../assets/sounds/fireworks.mp3');
const cheerSource = require('../../assets/sounds/cheer.mp3');

export function playFireworks(): void {
  const player = createAudioPlayer(fireworksSource);
  player.play();
}

export function playCheer(): void {
  const player = createAudioPlayer(cheerSource);
  player.play();
}
