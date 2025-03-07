import React, { useState, useEffect } from 'react';
import { useUser } from '../client/src/hooks/use-user';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { toast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { TimeInput } from './ui/time-input';

interface NotificationPreferences {
  enabled: boolean;
  preferences: {
    chat: {
      enabled: boolean;
      mode: 'all' | 'mentions' | 'none';
    };
    reminders: {
      enabled: boolean;
    };
    village: {
      enabled: boolean;
      types: {
        newMembers: boolean;
        memberUpdates: boolean;
        interactions: boolean;
      };
    };
    system: {
      enabled: boolean;
    };
  };
  schedule: {
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
}

export default function NotificationPreferences() {
  const { user } = useUser();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch notification preferences
  useEffect(() => {
    if (!user) return;

    async function fetchPreferences() {
      try {
        setLoading(true);
        const response = await fetch('/notifications/preferences');
        
        if (!response.ok) {
          throw new Error('Failed to fetch notification preferences');
        }
        
        const data = await response.json();
        setPreferences(data);
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        toast({
          title: 'Error',
          description: 'Failed to load notification preferences',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchPreferences();
  }, [user]);

  // Save notification preferences
  const savePreferences = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      const response = await fetch('/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }

      toast({
        title: 'Success',
        description: 'Notification preferences saved',
      });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle preference changes
  const handleMainToggle = (checked: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      enabled: checked,
    });
  };

  const handleChatToggle = (checked: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      preferences: {
        ...preferences.preferences,
        chat: {
          ...preferences.preferences.chat,
          enabled: checked,
        },
      },
    });
  };

  const handleChatModeChange = (value: string) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      preferences: {
        ...preferences.preferences,
        chat: {
          ...preferences.preferences.chat,
          mode: value as 'all' | 'mentions' | 'none',
        },
      },
    });
  };

  const handleRemindersToggle = (checked: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      preferences: {
        ...preferences.preferences,
        reminders: {
          ...preferences.preferences.reminders,
          enabled: checked,
        },
      },
    });
  };

  const handleVillageToggle = (checked: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      preferences: {
        ...preferences.preferences,
        village: {
          ...preferences.preferences.village,
          enabled: checked,
        },
      },
    });
  };

  const handleVillageTypeToggle = (type: keyof NotificationPreferences['preferences']['village']['types'], checked: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      preferences: {
        ...preferences.preferences,
        village: {
          ...preferences.preferences.village,
          types: {
            ...preferences.preferences.village.types,
            [type]: checked,
          },
        },
      },
    });
  };

  const handleSystemToggle = (checked: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      preferences: {
        ...preferences.preferences,
        system: {
          ...preferences.preferences.system,
          enabled: checked,
        },
      },
    });
  };

  const handleQuietHoursToggle = (checked: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      schedule: {
        ...preferences.schedule,
        quietHoursEnabled: checked,
      },
    });
  };

  const handleQuietHoursStartChange = (value: string) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      schedule: {
        ...preferences.schedule,
        quietHoursStart: value,
      },
    });
  };

  const handleQuietHoursEndChange = (value: string) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      schedule: {
        ...preferences.schedule,
        quietHoursEnd: value,
      },
    });
  };

  if (loading) {
    return <div className="flex justify-center p-6">Loading notification preferences...</div>;
  }

  if (!preferences) {
    return <div className="flex justify-center p-6">Failed to load notification preferences</div>;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Customize how and when you receive notifications from Nuri
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notifications-main" className="text-base font-medium">
              Enable Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Turn on to receive notifications from Nuri
            </p>
          </div>
          <Switch
            id="notifications-main"
            checked={preferences.enabled}
            onCheckedChange={handleMainToggle}
          />
        </div>

        <Separator />

        <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Notification Types</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Chat Notifications */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifications-chat" className="text-base">
                        Chat Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for new messages
                      </p>
                    </div>
                    <Switch
                      id="notifications-chat"
                      checked={preferences.preferences.chat.enabled}
                      onCheckedChange={handleChatToggle}
                      disabled={!preferences.enabled}
                    />
                  </div>
                  
                  <div className="pl-6 pt-2">
                    <Label htmlFor="chat-mode" className="text-sm">
                      Notification Mode
                    </Label>
                    <Select
                      value={preferences.preferences.chat.mode}
                      onValueChange={handleChatModeChange}
                      disabled={!preferences.enabled || !preferences.preferences.chat.enabled}
                    >
                      <SelectTrigger id="chat-mode" className="w-full max-w-xs mt-1">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Messages</SelectItem>
                        <SelectItem value="mentions">Only Mentions</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reminders */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label htmlFor="notifications-reminders" className="text-base">
                      Reminder Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for scheduled reminders
                    </p>
                  </div>
                  <Switch
                    id="notifications-reminders"
                    checked={preferences.preferences.reminders.enabled}
                    onCheckedChange={handleRemindersToggle}
                    disabled={!preferences.enabled}
                  />
                </div>

                {/* Village Updates */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifications-village" className="text-base">
                        Village Updates
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about your support network
                      </p>
                    </div>
                    <Switch
                      id="notifications-village"
                      checked={preferences.preferences.village.enabled}
                      onCheckedChange={handleVillageToggle}
                      disabled={!preferences.enabled}
                    />
                  </div>
                  
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="village-new-members" className="text-sm">
                        New Members
                      </Label>
                      <Switch
                        id="village-new-members"
                        checked={preferences.preferences.village.types.newMembers}
                        onCheckedChange={(checked) => handleVillageTypeToggle('newMembers', checked)}
                        disabled={!preferences.enabled || !preferences.preferences.village.enabled}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="village-member-updates" className="text-sm">
                        Member Updates
                      </Label>
                      <Switch
                        id="village-member-updates"
                        checked={preferences.preferences.village.types.memberUpdates}
                        onCheckedChange={(checked) => handleVillageTypeToggle('memberUpdates', checked)}
                        disabled={!preferences.enabled || !preferences.preferences.village.enabled}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="village-interactions" className="text-sm">
                        Interactions
                      </Label>
                      <Switch
                        id="village-interactions"
                        checked={preferences.preferences.village.types.interactions}
                        onCheckedChange={(checked) => handleVillageTypeToggle('interactions', checked)}
                        disabled={!preferences.enabled || !preferences.preferences.village.enabled}
                      />
                    </div>
                  </div>
                </div>

                {/* System Notifications */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label htmlFor="notifications-system" className="text-base">
                      System Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important system updates and announcements
                    </p>
                  </div>
                  <Switch
                    id="notifications-system"
                    checked={preferences.preferences.system.enabled}
                    onCheckedChange={handleSystemToggle}
                    disabled={!preferences.enabled}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>Quiet Hours</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="quiet-hours" className="text-base">
                      Enable Quiet Hours
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Pause notifications during specific hours
                    </p>
                  </div>
                  <Switch
                    id="quiet-hours"
                    checked={preferences.schedule.quietHoursEnabled}
                    onCheckedChange={handleQuietHoursToggle}
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label htmlFor="quiet-hours-start" className="text-sm">
                      Start Time
                    </Label>
                    <TimeInput
                      id="quiet-hours-start"
                      value={preferences.schedule.quietHoursStart}
                      onChange={handleQuietHoursStartChange}
                      disabled={!preferences.enabled || !preferences.schedule.quietHoursEnabled}
                      className="w-full mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="quiet-hours-end" className="text-sm">
                      End Time
                    </Label>
                    <TimeInput
                      id="quiet-hours-end"
                      value={preferences.schedule.quietHoursEnd}
                      onChange={handleQuietHoursEndChange}
                      disabled={!preferences.enabled || !preferences.schedule.quietHoursEnabled}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <CardFooter>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardFooter>
    </Card>
  );
} 