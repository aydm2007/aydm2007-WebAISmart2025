import { createApp } from './app';
const app = createApp();
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (AUTO_ARCHIVE_DAYS=${process.env.AUTO_ARCHIVE_DAYS||'30'})`);
});
