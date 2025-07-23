import React, { useState, useEffect } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { Link, useNavigate } from "@tanstack/react-router";
import { required, email, useForm } from "@modular-forms/react";
import { TextInput } from "../../../components/form/TextInput";
import { Button } from "../../../components/ui/button";
import { supabase, createCompleteUser, validateAdminUserCreation, AdminCreateUserData, UserCreationResult } from "../../../lib/supabase";
import { Enums } from "database.types";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { InterestsPicker } from "../../components/InterestsPicker";
import { LocationPicker, IAddress } from "../../components/LocationPicker";

// Password generation utility
const generateSecurePassword = (): string => {
  const length = 14;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = "";

  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

// Form data interfaces
interface PersonalDetailsForm {
  first_name: string;
  email: string;
  age: number;
  [key: string]: string | number; // Index signature for @modular-forms/react compatibility
}

interface LocationForm {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

interface RoleSettingsForm {
  role: Enums<"app_role"> | "user";
  accountStatus: "active" | "inactive";
  emailVerified: boolean;
  emailNotifications: boolean;
  requireEmailVerification: boolean;
}

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function AdminCreateUser() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("personal");

  // Form state management
  const [personalDetails, setPersonalDetails] = useState<Partial<PersonalDetailsForm>>({});
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [interestDescriptions, setInterestDescriptions] = useState<Record<string, string>>({});
  const [locationData, setLocationData] = useState<Partial<LocationForm>>({});
  const [address, setAddress] = useState<IAddress>({ postcode: "", city: "", country: "", country_code: "" });
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [roleSettings, setRoleSettings] = useState<Partial<RoleSettingsForm>>({
    role: "user",
    accountStatus: "active",
    emailVerified: false,
    emailNotifications: true,
    requireEmailVerification: true,
  });
  const [isDraft, setIsDraft] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationResult, setCreationResult] = useState<UserCreationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>("");

  // State adapters for picker components
  const selectedInterestsWithDescriptions = userInterests.reduce((acc, interestId) => {
    acc[interestId] = interestDescriptions[interestId] || "";
    return acc;
  }, {} as Record<string, string>);

  const toggleInterest = (interestId: string) => {
    if (userInterests.includes(interestId)) {
      setUserInterests(userInterests.filter((id) => id !== interestId));
      const newDescriptions = { ...interestDescriptions };
      delete newDescriptions[interestId];
      setInterestDescriptions(newDescriptions);
    } else {
      setUserInterests([...userInterests, interestId]);
    }
  };

  const removeInterest = (interestId: string) => {
    setUserInterests(userInterests.filter((id) => id !== interestId));
    const newDescriptions = { ...interestDescriptions };
    delete newDescriptions[interestId];
    setInterestDescriptions(newDescriptions);
  };

  const updateInterestDescription = (interestId: string, description: string) => {
    setInterestDescriptions({
      ...interestDescriptions,
      [interestId]: description,
    });
  };

  // Location state sync
  useEffect(() => {
    if (address.city && address.country) {
      setLocationData({
        ...locationData,
        city: address.city,
        country: address.country_code || address.country,
      });
    }
  }, [address]);

  useEffect(() => {
    if (coordinates) {
      setLocationData({
        ...locationData,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      });
    }
  }, [coordinates]);

  // Initialize address from locationData
  useEffect(() => {
    if (locationData.city || locationData.country) {
      setAddress({
        postcode: "",
        city: locationData.city || "",
        country: locationData.country || "",
        country_code: locationData.country || "",
      });
    }
  }, []);

  // Initialize coordinates from locationData
  useEffect(() => {
    if (locationData.latitude && locationData.longitude) {
      setCoordinates({
        lat: locationData.latitude,
        lng: locationData.longitude,
      });
    }
  }, []);

  const tabs: Tab[] = [
    {
      id: "personal",
      label: "Personal Details",
      content: <PersonalDetailsTab data={personalDetails} onUpdate={setPersonalDetails} onNext={() => setActiveTab("interests")} />,
    },
    {
      id: "interests",
      label: "Interests",
      content: (
        <AdminInterestsTab
          selectedInterestsWithDescriptions={selectedInterestsWithDescriptions}
          toggleInterest={toggleInterest}
          removeInterest={removeInterest}
          updateInterestDescription={updateInterestDescription}
          onNext={() => setActiveTab("location")}
          onPrev={() => setActiveTab("personal")}
        />
      ),
    },
    {
      id: "location",
      label: "Location",
      content: (
        <AdminLocationTab
          coordinates={coordinates}
          setAddress={setAddress}
          setCoordinates={setCoordinates}
          onNext={() => setActiveTab("role")}
          onPrev={() => setActiveTab("interests")}
        />
      ),
    },
    {
      id: "role",
      label: "Role & Settings",
      content: <RoleSettingsTab data={roleSettings} onUpdate={setRoleSettings} onPrev={() => setActiveTab("location")} />,
    },
  ];

  const handleSaveDraft = () => {
    setIsDraft(true);
    // TODO: Implement draft saving to localStorage or backend
    console.log("Draft saved:", { personalDetails, userInterests, locationData, roleSettings });
  };

  const handleCreateUser = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session || !data.session.user.id) {
      setCreationResult({
        success: false,
        error: "Authentication Error",
        details: "You must be logged in to create users",
      });
      setShowResult(true);
      return;
    }

    setIsCreating(true);
    setCreationResult(null);
    setShowResult(false);

    try {
      // Generate secure password
      const newPassword = generateSecurePassword();
      setGeneratedPassword(newPassword);

      // Validate admin permissions
      const permissionCheck = await validateAdminUserCreation(data.session.user.id, roleSettings.role || "user");
      if (!permissionCheck.isValid) {
        setCreationResult({
          success: false,
          error: "Permission Denied",
          details: permissionCheck.error || "Insufficient permissions to create users",
        });
        setShowResult(true);
        return;
      }

      // Prepare user data for creation
      const userData: AdminCreateUserData = {
        first_name: personalDetails.first_name || "",
        email: personalDetails.email || "",
        password: newPassword,
        age: personalDetails.age || 0,
        interests: Object.keys(selectedInterestsWithDescriptions),
        interestDescriptions: selectedInterestsWithDescriptions,
        city: address.city || "",
        country: address.country_code || address.country || "",
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
        role: roleSettings.role || "user",
        accountStatus: roleSettings.accountStatus || "active",
        emailVerified: roleSettings.emailVerified || false,
        emailNotifications: roleSettings.emailNotifications || false,
        requireEmailVerification: roleSettings.requireEmailVerification || true,
      };

      console.log("Creating user with data:", userData);

      // Create the user using the complete workflow
      const result = await createCompleteUser(userData);

      setCreationResult(result);
      setShowResult(true);

      // If successful, navigate to users list after a delay
      if (result.success) {
        setTimeout(() => {
          navigate({ to: "/godaddy/users" });
        }, 3000);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      setCreationResult({
        success: false,
        error: "User Creation Failed",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      });
      setShowResult(true);
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = () => {
    return (
      personalDetails.first_name &&
      personalDetails.email &&
      personalDetails.age &&
      Object.keys(selectedInterestsWithDescriptions).length > 0 &&
      coordinates &&
      address.city &&
      address.country
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
            <p className="mt-1 text-sm text-gray-500">Add a new user account with profile information and role settings</p>
          </div>
          <Link
            to="/godaddy/users"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ← Back to Users
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">{tabs.find((tab) => tab.id === activeTab)?.content}</div>
        </div>

        {/* Creation Result Display */}
        {showResult && creationResult && (
          <div className="mb-6">
            {creationResult.success ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">User Created Successfully!</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>The user account has been created with the following details:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Email: {personalDetails.email}</li>
                        <li>Name: {personalDetails.first_name}</li>
                        <li>Role: {roleSettings.role}</li>
                        <li>Status: {roleSettings.accountStatus}</li>
                        {creationResult.userId && <li>User ID: {creationResult.userId}</li>}
                      </ul>
                      {generatedPassword && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <h4 className="text-sm font-medium text-yellow-800 mb-2">Generated Password</h4>
                          <div className="flex items-center justify-between bg-white border border-yellow-200 rounded px-3 py-2">
                            <code className="text-sm font-mono text-gray-900 select-all">{generatedPassword}</code>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(generatedPassword)}
                              className="ml-2 text-xs text-yellow-700 hover:text-yellow-900 underline"
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-xs text-yellow-700 mt-2">
                            Please share this password with the user. They will be required to change it on first login.
                          </p>
                        </div>
                      )}
                      <p className="mt-3 font-medium">Redirecting to users list in 3 seconds...</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{creationResult.error || "User Creation Failed"}</h3>
                    {creationResult.details && (
                      <div className="mt-2 text-sm text-red-700">
                        <p>{creationResult.details}</p>
                      </div>
                    )}
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowResult(false)}
                        className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isCreating}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDraft ? "Draft Saved" : "Save as Draft"}
          </button>
          <div className="flex space-x-3">
            <Link
              to="/godaddy/users"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleCreateUser}
              disabled={!isFormValid() || isCreating || (showResult && creationResult?.success)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Creating User...
                </>
              ) : showResult && creationResult?.success ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  User Created
                </>
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Personal Details Tab Component
interface PersonalDetailsTabProps {
  data: Partial<PersonalDetailsForm>;
  onUpdate: (data: Partial<PersonalDetailsForm>) => void;
  onNext: () => void;
}

function PersonalDetailsTab({ data, onUpdate, onNext }: PersonalDetailsTabProps) {
  const [, { Form, Field }] = useForm<PersonalDetailsForm>({
    initialValues: {
      first_name: data.first_name || "",
      email: data.email || "",
      age: data.age || 0,
    },
  });

  const handleSubmit = (values: PersonalDetailsForm) => {
    onUpdate(values);
    onNext();
  };

  const handleFieldChange = (field: keyof PersonalDetailsForm, value: string | number) => {
    const updatedData = { ...data, [field]: value };
    onUpdate(updatedData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <p className="text-sm text-gray-500 mb-6">A secure password will be automatically generated for this user.</p>
        <Form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field
              name="first_name"
              validate={[
                required("Name is required"),
                (value) => {
                  if (!value) return "";
                  const str = String(value);
                  if (str.length < 2) return "Name must be at least 2 characters";
                  if (str.length > 50) return "Name must be less than 50 characters";
                  return "";
                },
              ]}
            >
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type="text"
                  label="Name *"
                  placeholder="Enter Name"
                  onChange={(e) => {
                    props.onChange(e);
                    handleFieldChange("first_name", e.target.value);
                  }}
                  required
                />
              )}
            </Field>

            <Field
              name="age"
              type="number"
              validate={[
                required("Age is required"),
                (value) => {
                  if (!value) return "";
                  const age = Number(value);
                  if (age < 13) return "User must be at least 13 years old";
                  if (age > 120) return "Please enter a valid age";
                  return "";
                },
              ]}
            >
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value || ""}
                  error={field.error}
                  type="number"
                  label="Age *"
                  onChange={(e) => {
                    props.onChange(e);
                    handleFieldChange("age", parseInt(e.target.value) || 0);
                  }}
                  className="w-24"
                  required
                />
              )}
            </Field>

            <Field name="email" validate={[required("Email is required"), email("Please enter a valid email address")]}>
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type="email"
                  label="Email Address *"
                  placeholder="Enter email address"
                  onChange={(e) => {
                    props.onChange(e);
                    handleFieldChange("email", e.target.value);
                  }}
                  required
                />
              )}
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Next: Select Interests</Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

// Admin Interests Tab Component
interface AdminInterestsTabProps {
  selectedInterestsWithDescriptions: Record<string, string>;
  toggleInterest: (interestId: string) => void;
  removeInterest: (interestId: string) => void;
  updateInterestDescription: (interestId: string, description: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

function AdminInterestsTab({
  selectedInterestsWithDescriptions,
  toggleInterest,
  removeInterest,
  updateInterestDescription,
  onNext,
  onPrev,
}: AdminInterestsTabProps) {
  const handleNext = () => {
    if (Object.keys(selectedInterestsWithDescriptions).length === 0) {
      alert("Please select at least one interest");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Interests</h3>

        <InterestsPicker
          selectedInterestsWithDescriptions={selectedInterestsWithDescriptions}
          toggleInterest={toggleInterest}
          removeInterest={removeInterest}
          updateInterestDescription={updateInterestDescription}
        />

        <div className="flex justify-between mt-6">
          <Button type="button" variant="secondary" onClick={onPrev}>
            Previous: Personal Details
          </Button>
          <Button type="button" onClick={handleNext} disabled={Object.keys(selectedInterestsWithDescriptions).length === 0}>
            Next: Location
          </Button>
        </div>
      </div>
    </div>
  );
}

// Admin Location Tab Component
interface AdminLocationTabProps {
  coordinates: { lat: number; lng: number } | undefined;
  setAddress: (address: IAddress) => void;
  setCoordinates: (coords: { lat: number; lng: number }) => void;
  onNext: () => void;
  onPrev: () => void;
}

function AdminLocationTab({ coordinates, setAddress, setCoordinates, onNext, onPrev }: AdminLocationTabProps) {
  const handleNext = () => {
    if (!coordinates) {
      alert("Please select a location");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>

        <LocationPicker coordinates={coordinates} setAddress={setAddress} setCoordinates={setCoordinates} />

        <div className="flex justify-between mt-6">
          <Button type="button" variant="secondary" onClick={onPrev}>
            Previous: Interests
          </Button>
          <Button type="button" onClick={handleNext} disabled={!coordinates}>
            Next: Role & Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// Role & Settings Tab Component
interface RoleSettingsTabProps {
  data: Partial<RoleSettingsForm>;
  onUpdate: (data: Partial<RoleSettingsForm>) => void;
  onPrev: () => void;
}

function RoleSettingsTab({ data, onUpdate, onPrev }: RoleSettingsTabProps) {
  // Note: In a real implementation, you'd fetch current user role to prevent privilege escalation
  const availableRoles: Array<{ value: Enums<"app_role"> | "user"; label: string; description: string }> = [
    { value: "user", label: "User", description: "Standard user with basic access to the application" },
    { value: "moderator", label: "Moderator", description: "Can moderate content and manage users" },
    { value: "admin", label: "Administrator", description: "Full system access and administration privileges" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Role & Account Settings</h3>

        <div className="space-y-6">
          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              User Role *
            </label>
            <select
              name="role"
              id="role"
              value={data.role || "user"}
              onChange={(e) => onUpdate({ ...data, role: e.target.value as Enums<"app_role"> | "user" })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {availableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              {availableRoles.find((r) => r.value === data.role)?.description ||
                "Determines what actions this user can perform in the application."}
            </p>
          </div>

          {/* Account Status */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-3">Account Status</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="active"
                    name="accountStatus"
                    type="radio"
                    checked={data.accountStatus === "active"}
                    onChange={() => onUpdate({ ...data, accountStatus: "active" })}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="active" className="font-medium text-gray-700 cursor-pointer">
                    Active
                  </label>
                  <p className="text-gray-500">User can log in and use the application normally.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="inactive"
                    name="accountStatus"
                    type="radio"
                    checked={data.accountStatus === "inactive"}
                    onChange={() => onUpdate({ ...data, accountStatus: "inactive" })}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="inactive" className="font-medium text-gray-700 cursor-pointer">
                    Inactive
                  </label>
                  <p className="text-gray-500">User account is disabled and cannot log in.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Verification */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-3">Email Settings</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailVerified"
                    name="emailVerified"
                    type="checkbox"
                    checked={data.emailVerified || false}
                    onChange={(e) => onUpdate({ ...data, emailVerified: e.target.checked })}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="emailVerified" className="font-medium text-gray-700 cursor-pointer">
                    Email Already Verified
                  </label>
                  <p className="text-gray-500">Check this if the email has already been verified by the user.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="requireEmailVerification"
                    name="requireEmailVerification"
                    type="checkbox"
                    checked={data.requireEmailVerification || false}
                    onChange={(e) => onUpdate({ ...data, requireEmailVerification: e.target.checked })}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="requireEmailVerification" className="font-medium text-gray-700 cursor-pointer">
                    Require Email Verification
                  </label>
                  <p className="text-gray-500">User must verify their email before accessing the application.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-3">Notification Settings</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailNotifications"
                    name="emailNotifications"
                    type="checkbox"
                    checked={data.emailNotifications || false}
                    onChange={(e) => onUpdate({ ...data, emailNotifications: e.target.checked })}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="emailNotifications" className="font-medium text-gray-700 cursor-pointer">
                    Email Notifications
                  </label>
                  <p className="text-gray-500">Send account and activity notifications via email.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button type="button" variant="secondary" onClick={onPrev}>
            Previous: Location
          </Button>
          <div className="text-sm text-gray-500">Review all settings and click "Create User" below to complete</div>
        </div>
      </div>
    </div>
  );
}
