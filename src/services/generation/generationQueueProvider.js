import AppSettingModel from '../../models/AppSetting.js';

const readCounterValue = (doc) => {
  const ft = doc?.featureToggles;
  if (!ft) {
    return null;
  }
  if (typeof ft.get === 'function') {
    return ft.get('generationQueueCounter') ?? null;
  }
  return ft.generationQueueCounter ?? null;
};

const incrementQueueCounter = async ({ session } = {}) => {
  const query = AppSettingModel.findOneAndUpdate(
    { section: 'SYSTEM', key: 'global' },
    { $inc: { 'featureToggles.generationQueueCounter': 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (session) {
    query.session(session);
  }
  const doc = await query.lean();
  const value = Number(readCounterValue(doc));
  return Number.isFinite(value) && value > 0 ? value : 1;
};

class InMemoryQueueProvider {
  async getQueuePosition({ session } = {}) {
    return incrementQueueCounter({ session });
  }
}

const generationQueueProvider = new InMemoryQueueProvider();

export default generationQueueProvider;
