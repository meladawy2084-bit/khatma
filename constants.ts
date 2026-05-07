import { Juz, JuzStatus, ReadingStatus } from './types';

export const INITIAL_JUZ_LIST: Juz[] = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  label: `الجزء ${i + 1}`,
  status: JuzStatus.AVAILABLE,
  readingStatus: ReadingStatus.NOT_STARTED,
}));

export const APP_LOGO_URL = "https://drive.google.com/file/d/1Hp-crIlk0fpmIcuGhWw08BMWEo9nRnn1/view?usp=drive_link"; // Placeholder if user provided image fails, but we will use the logic to render user provided image in UI
