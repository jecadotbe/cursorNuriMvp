import { useState } from 'react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';

const NotificationTest = () => {
  const [loading, setLoading] = useState(false);

  const sendTestNotification = async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      toast({
        title: 'Notifications not enabled',
        description: 'Please enable notifications first',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/notifications/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      toast({
        title: 'Test notification sent',
        description: 'Check your device for the notification',
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4">
      <Button 
        onClick={sendTestNotification} 
        disabled={loading}
        variant="outline"
        size="sm"
      >
        {loading ? 'Sending...' : 'Send Test Notification'}
      </Button>
    </div>
  );
};

export default NotificationTest; 