import { createAudioPlayer } from 'expo-audio';

const fireworksSource = require('../../assets/sounds/fireworks.wav');
const cheerSource = require('../../assets/sounds/cheer.wav');

export function playFireworks(): void {
  const player = createAudioPlayer(fireworksSource);
  player.play();
}

export function playCheer(): void {
  const player = createAudioPlayer(cheerSource);
  player.play();
}
