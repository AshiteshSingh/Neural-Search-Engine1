import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { category, content, userPrompt, comments, email } = body;

        // In a real application, you would use a library like Nodemailer here
        // to send an actual email using SMTP or an API like SendGrid/Resend.

        // Simulating sending email to the requested address
        console.log("------------------------------------------------");
        console.log(`[REPORT SUBMITTED]`);
        console.log(`To: raghuvesh1285@gmail.com`); // Hardcoded as per user request
        console.log(`Category: ${category}`);
        console.log(`Reported Content: ${content}`);
        console.log(`Original Prompt: ${userPrompt}`);
        console.log(`User Comments: ${comments}`);
        console.log(`User Email (Optional): ${email}`);
        console.log("------------------------------------------------");

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return NextResponse.json({
            success: true,
            message: "Report sent successfully to raghuvesh1285@gmail.com"
        });

    } catch (error) {
        console.error("Error processing report:", error);
        return NextResponse.json(
            { error: "Failed to process report" },
            { status: 500 }
        );
    }
}
