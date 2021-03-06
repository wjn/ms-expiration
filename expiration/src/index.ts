import { NotFoundError, logIt, LogType, natsWrapper } from '@nielsendigital/ms-common';
import { OrderCreatedListener } from './events/listeners/order-created-listener';

const startApp = async () => {
  logIt.out(LogType.STARTED, 'Expiration service started');
  // verify env vars are present

  if (!process.env.NATS_CLUSTER_ID) {
    throw new NotFoundError('NATS_CLUSTER_ID k8s env var must be defined.');
  }

  if (!process.env.NATS_CLIENT_ID) {
    throw new NotFoundError('NATS_CLIENT_ID k8s env var must be defined.');
  }

  if (!process.env.NATS_URL) {
    throw new NotFoundError('NATS_URL k8s env var must be defined.');
  }

  logIt.out(LogType.INFO, 'All required ENV Vars verified as defined');

  // connect to NATS
  try {
    logIt.out(LogType.INFO, 'Attempting connection to NATS');

    await natsWrapper.connect(
      // see infra/k8s/expiration-depl.yaml for values
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    );

    // process graceful exit
    natsWrapper.client.on('close', () => {
      logIt.out(LogType.STOPPED, 'NATS Connection Closed');
      process.exit();
    });

    // gracefully exit
    process.on('SIGINT', () => natsWrapper.client.close());
    process.on('SIGTERM', () => natsWrapper.client.close());

    new OrderCreatedListener(natsWrapper.client).listen();
    // -----
  } catch (err) {
    logIt.out(LogType.ERROR, 'NATS failed to load.');
    logIt.out(LogType.ERROR, err);
  }
};

startApp();
