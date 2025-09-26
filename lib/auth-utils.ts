const domainMapping = {
    "example.edu": "Example University",
    "sample.edu": "Sample University",
    // Add more mappings as needed
};

export const extractUniversityFromEmail = (email) => {
    const domain = email.split('@')[1];
    return domainMapping[domain] || null;
};
