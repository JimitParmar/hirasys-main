declare module "razorpay" {
  interface RazorpayOptions {
    key_id: string;
    key_secret: string;
  }

  interface OrderCreateParams {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
  }

  interface PlanCreateParams {
    period: string;
    interval: number;
    item: {
      name: string;
      amount: number;
      currency: string;
      description?: string;
    };
  }

  interface SubscriptionCreateParams {
    plan_id: string;
    total_count: number;
    quantity?: number;
    customer_notify?: number;
    notes?: Record<string, string>;
  }

  class Razorpay {
    constructor(options: RazorpayOptions);
    orders: {
      create(params: OrderCreateParams): Promise<any>;
    };
    payments: {
      fetch(paymentId: string): Promise<any>;
      refund(paymentId: string, params?: any): Promise<any>;
    };
    plans: {
      create(params: PlanCreateParams): Promise<any>;
    };
    subscriptions: {
      create(params: SubscriptionCreateParams): Promise<any>;
      cancel(subscriptionId: string, cancelAtCycleEnd: boolean): Promise<any>;
    };
  }

  export = Razorpay;
}