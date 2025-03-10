import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, X, Plus } from "lucide-react";
import NotificationPreferences from "@/components/NotificationPreferences";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type OnboardingData = {
  basicInfo: {
    name: string;
    parentType: "mom" | "dad" | "other";
    experienceLevel: "first_time" | "experienced" | "multiple_children";
  };
  stressAssessment: {
    stressLevel: "low" | "moderate" | "high" | "very_high";
    primaryConcerns: string[];
    supportNetwork: string[];
  };
  childProfiles: Array<{
    name: string;
    age: number;
    specialNeeds: string[];
  }>;
  goals: {
    shortTerm: string[];
    longTerm: string[];
    supportAreas: string[];
  };
};

const defaultFormData: OnboardingData = {
  basicInfo: {
    name: "",
    parentType: "mom",
    experienceLevel: "first_time",
  },
  stressAssessment: {
    stressLevel: "low",
    primaryConcerns: [],
    supportNetwork: [],
  },
  childProfiles: [],
  goals: {
    shortTerm: [],
    longTerm: [],
    supportAreas: [],
  },
};

const isValidJson = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

export default function EditProfileView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<OnboardingData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newConcern, setNewConcern] = useState("");
  const [newSupport, setNewSupport] = useState("");
  const [newShortTerm, setNewShortTerm] = useState("");
  const [newLongTerm, setNewLongTerm] = useState("");
  const [newSupportArea, setNewSupportArea] = useState("");
  const [newSpecialNeed, setNewSpecialNeed] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/onboarding/progress'],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache the data
    queryFn: async () => {
      try {
        const response = await fetch('/api/onboarding/progress', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile data: ${await response.text()}`);
        }

        const data = await response.json();
        console.log('Fetched profile data:', data);
        return data;
      } catch (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }
    },
  });

  useEffect(() => {
    if (profile?.onboardingData) {
      try {
        let parsedData: OnboardingData;

        if (typeof profile.onboardingData === 'string') {
          parsedData = isValidJson(profile.onboardingData)
            ? JSON.parse(profile.onboardingData)
            : defaultFormData;
        } else {
          parsedData = profile.onboardingData;
        }

        const updatedData = {
          ...defaultFormData,
          ...parsedData,
          basicInfo: {
            ...defaultFormData.basicInfo,
            ...(parsedData.basicInfo || {}),
            name: parsedData.basicInfo?.name || profile.name || "",
          },
          stressAssessment: {
            ...defaultFormData.stressAssessment,
            ...(parsedData.stressAssessment || {}),
          },
          childProfiles: parsedData.childProfiles || [],
          goals: {
            ...defaultFormData.goals,
            ...(parsedData.goals || {}),
          },
        };

        console.log('Setting form data from profile:', updatedData);
        setFormData(updatedData);
      } catch (error) {
        console.error('Error parsing onboarding data:', error);
        setFormData(defaultFormData);
        toast({
          title: "Warning",
          description: "Some profile data could not be loaded. Using default values.",
          variant: "destructive",
        });
      }
    }
  }, [profile, toast]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      console.log('Sending profile update:', data);

      const response = await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: 4,
          data: data
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || 'Failed to update profile');
        } catch {
          throw new Error(errorText || 'Failed to update profile');
        }
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Je profiel is bijgewerkt",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/progress'] });
      queryClient.refetchQueries({ queryKey: ['/api/onboarding/progress'] });
      setLocation("/profile");
    },
    onError: (error: Error) => {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.log('Submitting form data:', formData);
      await updateProfileMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addConcern = () => {
    if (newConcern.trim()) {
      setFormData({
        ...formData,
        stressAssessment: {
          ...formData.stressAssessment,
          primaryConcerns: [...formData.stressAssessment.primaryConcerns, newConcern.trim()]
        }
      });
      setNewConcern("");
    }
  };

  const removeConcern = (index: number) => {
    setFormData({
      ...formData,
      stressAssessment: {
        ...formData.stressAssessment,
        primaryConcerns: formData.stressAssessment.primaryConcerns.filter((_, i) => i !== index)
      }
    });
  };

  const addSupport = () => {
    if (newSupport.trim()) {
      setFormData({
        ...formData,
        stressAssessment: {
          ...formData.stressAssessment,
          supportNetwork: [...formData.stressAssessment.supportNetwork, newSupport.trim()]
        }
      });
      setNewSupport("");
    }
  };

  const removeSupport = (index: number) => {
    setFormData({
      ...formData,
      stressAssessment: {
        ...formData.stressAssessment,
        supportNetwork: formData.stressAssessment.supportNetwork.filter((_, i) => i !== index)
      }
    });
  };

  const addChild = () => {
    setFormData({
      ...formData,
      childProfiles: [
        ...formData.childProfiles,
        { name: "", age: 0, specialNeeds: [] }
      ]
    });
  };

  const updateChild = (index: number, field: keyof typeof formData.childProfiles[0], value: any) => {
    const updatedChildren = [...formData.childProfiles];
    updatedChildren[index] = {
      ...updatedChildren[index],
      [field]: value
    };
    setFormData({
      ...formData,
      childProfiles: updatedChildren
    });
  };

  const removeChild = (index: number) => {
    setFormData({
      ...formData,
      childProfiles: formData.childProfiles.filter((_, i) => i !== index)
    });
  };

  const addSpecialNeed = (childIndex: number) => {
    if (newSpecialNeed.trim()) {
      const updatedChildren = [...formData.childProfiles];
      updatedChildren[childIndex] = {
        ...updatedChildren[childIndex],
        specialNeeds: [...updatedChildren[childIndex].specialNeeds, newSpecialNeed.trim()]
      };
      setFormData({
        ...formData,
        childProfiles: updatedChildren
      });
      setNewSpecialNeed("");
    }
  };

  const removeSpecialNeed = (childIndex: number, needIndex: number) => {
    const updatedChildren = [...formData.childProfiles];
    updatedChildren[childIndex] = {
      ...updatedChildren[childIndex],
      specialNeeds: updatedChildren[childIndex].specialNeeds.filter((_, i) => i !== needIndex)
    };
    setFormData({
      ...formData,
      childProfiles: updatedChildren
    });
  };

  const addGoal = (type: 'shortTerm' | 'longTerm' | 'supportAreas') => {
    const value = type === 'shortTerm' ? newShortTerm : type === 'longTerm' ? newLongTerm : newSupportArea;
    if (value.trim()) {
      setFormData({
        ...formData,
        goals: {
          ...formData.goals,
          [type]: [...formData.goals[type], value.trim()]
        }
      });
      if (type === 'shortTerm') setNewShortTerm("");
      else if (type === 'longTerm') setNewLongTerm("");
      else setNewSupportArea("");
    }
  };

  const removeGoal = (type: 'shortTerm' | 'longTerm' | 'supportAreas', index: number) => {
    setFormData({
      ...formData,
      goals: {
        ...formData.goals,
        [type]: formData.goals[type].filter((_, i) => i !== index)
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-gradient" style={{
      backgroundSize: "400% 400%",
      background: `linear-gradient(135deg, #F8DD9F 0%, #F2F0E5 50%, #F2F0E5 100%)`
    }}>
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          onClick={() => setLocation("/profile")}
          className="mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Terug naar profiel
        </Button>
        <h1 className="text-2xl font-bold">Bewerk Profiel</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-2xl mx-auto">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="profile">Profiel Informatie</TabsTrigger>
            <TabsTrigger value="notifications">Notificaties</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basis Informatie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Naam</Label>
                  <Input
                    id="name"
                    value={formData.basicInfo.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        basicInfo: {
                          ...formData.basicInfo,
                          name: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentType">Ouderrol</Label>
                  <Select
                    value={formData.basicInfo.parentType}
                    onValueChange={(value: "mom" | "dad" | "other") =>
                      setFormData({
                        ...formData,
                        basicInfo: {
                          ...formData.basicInfo,
                          parentType: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer je ouderrol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mom">Moeder</SelectItem>
                      <SelectItem value="dad">Vader</SelectItem>
                      <SelectItem value="other">Anders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Ervaring niveau</Label>
                  <Select
                    value={formData.basicInfo.experienceLevel}
                    onValueChange={(value: "first_time" | "experienced" | "multiple_children") =>
                      setFormData({
                        ...formData,
                        basicInfo: {
                          ...formData.basicInfo,
                          experienceLevel: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer ervaring niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_time">Eerste kind</SelectItem>
                      <SelectItem value="experienced">Ervaren</SelectItem>
                      <SelectItem value="multiple_children">Meerdere kinderen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stress & Ondersteuning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stressLevel">Stress niveau</Label>
                  <Select
                    value={formData.stressAssessment.stressLevel}
                    onValueChange={(value: "low" | "moderate" | "high" | "very_high") =>
                      setFormData({
                        ...formData,
                        stressAssessment: {
                          ...formData.stressAssessment,
                          stressLevel: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer stress niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Laag</SelectItem>
                      <SelectItem value="moderate">Gemiddeld</SelectItem>
                      <SelectItem value="high">Hoog</SelectItem>
                      <SelectItem value="very_high">Zeer hoog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Zorgen</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newConcern}
                      onChange={(e) => setNewConcern(e.target.value)}
                      placeholder="Voeg een zorg toe"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addConcern();
                        }
                      }}
                    />
                    <Button type="button" onClick={addConcern}>
                      Toevoegen
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.stressAssessment.primaryConcerns.map((concern, index) => (
                      <Badge key={index} variant="secondary">
                        {concern}
                        <button
                          type="button"
                          onClick={() => removeConcern(index)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ondersteuningsnetwerk</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSupport}
                      onChange={(e) => setNewSupport(e.target.value)}
                      placeholder="Voeg ondersteuning toe"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSupport();
                        }
                      }}
                    />
                    <Button type="button" onClick={addSupport}>
                      Toevoegen
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.stressAssessment.supportNetwork.map((support, index) => (
                      <Badge key={index} variant="secondary">
                        {support}
                        <button
                          type="button"
                          onClick={() => removeSupport(index)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kinderen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button type="button" onClick={addChild} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Kind toevoegen
                </Button>

                {formData.childProfiles.map((child, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Kind {index + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeChild(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Naam</Label>
                        <Input
                          value={child.name}
                          onChange={(e) => updateChild(index, 'name', e.target.value)}
                          placeholder="Naam van het kind"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Leeftijd</Label>
                        <Input
                          type="number"
                          value={child.age}
                          onChange={(e) => updateChild(index, 'age', parseInt(e.target.value) || 0)}
                          min={0}
                          max={18}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Speciale behoeften</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newSpecialNeed}
                            onChange={(e) => setNewSpecialNeed(e.target.value)}
                            placeholder="Voeg speciale behoefte toe"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addSpecialNeed(index);
                              }
                            }}
                          />
                          <Button type="button" onClick={() => addSpecialNeed(index)}>
                            Toevoegen
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {child.specialNeeds.map((need, needIndex) => (
                            <Badge key={needIndex} variant="secondary">
                              {need}
                              <button
                                type="button"
                                onClick={() => removeSpecialNeed(index, needIndex)}
                                className="ml-2"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Doelen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Korte termijn doelen</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newShortTerm}
                      onChange={(e) => setNewShortTerm(e.target.value)}
                      placeholder="Voeg korte termijn doel toe"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addGoal('shortTerm');
                        }
                      }}
                    />
                    <Button type="button" onClick={() => addGoal('shortTerm')}>
                      Toevoegen
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.goals.shortTerm.map((goal, index) => (
                      <Badge key={index} variant="secondary">
                        {goal}
                        <button
                          type="button"
                          onClick={() => removeGoal('shortTerm', index)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Lange termijn doelen</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newLongTerm}
                      onChange={(e) => setNewLongTerm(e.target.value)}
                      placeholder="Voeg lange termijn doel toe"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addGoal('longTerm');
                        }
                      }}
                    />
                    <Button type="button" onClick={() => addGoal('longTerm')}>
                      Toevoegen
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.goals.longTerm.map((goal, index) => (
                      <Badge key={index} variant="secondary">
                        {goal}
                        <button
                          type="button"
                          onClick={() => removeGoal('longTerm', index)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ondersteuningsgebieden</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSupportArea}
                      onChange={(e) => setNewSupportArea(e.target.value)}
                      placeholder="Voeg ondersteuningsgebied toe"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addGoal('supportAreas');
                        }
                      }}
                    />
                    <Button type="button" onClick={() => addGoal('supportAreas')}>
                      Toevoegen
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.goals.supportAreas.map((area, index) => (
                      <Badge key={index} variant="secondary">
                        {area}
                        <button
                          type="button"
                          onClick={() => removeGoal('supportAreas', index)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <NotificationPreferences />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/profile")}
            disabled={isSubmitting}
          >
            Annuleren
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opslaan...
              </>
            ) : (
              "Wijzigingen opslaan"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}