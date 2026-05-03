"use strict";

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const {
  createCollege,
  createCollegeStudent,
  createRecruiter,
  createJob,
  createApplication
} = require("./helpers/fixtures");
const {
  ensureOnboardingInstancesForStudentUser,
  buildStudentPortalPayload
} = require("../services/onboarding/service");

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function createSelectedOffer({ studentId, recruiterId, companyName, location }) {
  const job = await createJob(recruiterId, {
    companyName,
    title: `${companyName} Engineer`,
    companyDomain: `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`
  });

  return createApplication(studentId, job._id, {
    status: "SELECTED",
    offer: {
      salary: "6 LPA",
      joiningDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location,
      reportingTime: "10:30 AM",
      officeLocation: {
        address: location,
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        lat: 18.559,
        lng: 73.786
      },
      generatedAt: new Date(),
      status: "ACCEPTED",
      acceptedAt: new Date(),
      pdfPath: "/offers/test.pdf"
    }
  });
}

describe("Onboarding instances", () => {
  it("keeps onboarding progress separate for multiple accepted offers", async () => {
    const college = await createCollege();
    const { user, student } = await createCollegeStudent(college);
    const { user: recruiter } = await createRecruiter();
    await createSelectedOffer({
      studentId: student._id,
      recruiterId: recruiter._id,
      companyName: "AlphaTech",
      location: "AlphaTech Pune Office"
    });
    await createSelectedOffer({
      studentId: student._id,
      recruiterId: recruiter._id,
      companyName: "BetaWorks",
      location: "BetaWorks Mumbai Office"
    });

    const { instances } = await ensureOnboardingInstancesForStudentUser(user._id);
    expect(instances).toHaveLength(2);

    const payload = await buildStudentPortalPayload({
      userId: user._id,
      selectedInstanceId: null
    });

    expect(payload.mode).toBe("selector");
    expect(payload.companies).toHaveLength(2);
    expect(payload.companies.every((company) => company.instanceId && company.applicationId)).toBe(true);
    expect(new Set(payload.companies.map((company) => String(company.applicationId))).size).toBe(2);

    const [completedInstance] = instances;
    completedInstance.steps.forEach((step) => {
      step.status = "completed";
      step.completedAt = new Date();
    });
    completedInstance.status = "completed";
    completedInstance.completedAt = new Date();
    completedInstance.summary = {
      recruiterId: completedInstance.summary?.recruiterId || null,
      completedSteps: completedInstance.steps.length,
      totalSteps: completedInstance.steps.length
    };
    await completedInstance.save();

    const { instances: refreshedInstances } = await ensureOnboardingInstancesForStudentUser(user._id);
    expect(refreshedInstances).toHaveLength(2);

    const completed = refreshedInstances.find((instance) => String(instance._id) === String(completedInstance._id));
    const other = refreshedInstances.find((instance) => String(instance._id) !== String(completedInstance._id));
    expect(completed.status).toBe("completed");
    expect(other.status).not.toBe("completed");
  });

  it("uses the offer office location in onboarding day one details", async () => {
    const college = await createCollege();
    const { user, student } = await createCollegeStudent(college);
    const { user: recruiter } = await createRecruiter();
    await createSelectedOffer({
      studentId: student._id,
      recruiterId: recruiter._id,
      companyName: "LocationCorp",
      location: "Tower 9, Baner Road, Pune"
    });

    const { instances } = await ensureOnboardingInstancesForStudentUser(user._id);
    const payload = await buildStudentPortalPayload({
      userId: user._id,
      selectedInstanceId: instances[0]._id
    });
    const dayOneStep = payload.selectedInstance.steps.find((step) => step.type === "day_one_info");
    const locationText = [
      dayOneStep.content.location.name,
      ...(dayOneStep.content.location.addressLines || [])
    ].join(" ");

    expect(locationText).toContain("Tower 9, Baner Road, Pune");
    expect(locationText).not.toMatch(/123 Technology Drive|San Francisco/i);
  });
});
