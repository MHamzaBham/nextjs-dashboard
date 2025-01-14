"use server"

import {z} from 'zod'
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
   
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    }
    catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }
    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

const UpdateInvoice = FormSchema.omit({id: true, date: true})

export async function updateInvoice(id: string, formData: FormData) {
    const {customerId, amount, status} = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    })
    const amountInCents = amount * 100

    try {
        await sql `
            UPDATE invoices SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `
    }
    catch (error) {
        return {
            message: 'Database Error: Failed to Update Invoice.',
        };
    }
    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}


export async function deleteInvoice(id: string) {
    try {
        await sql`
            DELETE FROM invoices WHERE id = ${id}
        `
    }
    catch (error) {
        return {
            message: 'Database Error: Failed to Delete Invoice.',
        };
    }
    revalidatePath('/dashboard/invoices')
}


export async function authenticate(prevState: string | undefined,formData: FormData) {
try {
    await signIn('credentials', formData);
} catch (error) {
    if (error instanceof AuthError) {
    switch (error.type) {
        case 'CredentialsSignin':
        return 'Invalid credentials.';
        default:
        return 'Something went wrong.';
    }
    }
    throw error;
}
}

export type CustomerState = {
  errors?: {
    name?: string[];
    email?: string[];
    image_url?: string[];
  };
  message?: string;
};

const CustomerFormSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    image_url: z.instanceof(File)
    .refine(file => file.type === 'image/png' || file.type === 'image/jpeg', {
      message: 'File must be a PNG or JPG image.',
    })
    .optional()
});
const CreateCustomer = CustomerFormSchema.omit({ id: true });

export async function createCustomer(prevState: CustomerState, formData: FormData) {

  // Validate form fields
  const validatedFields = CreateCustomer.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Customer.',
    };
  }

  const { name, email, image_url } = validatedFields.data;

  let imageUrl = null;

  if (image_url) {
    try {
      imageUrl = await uploadImageToStorage(image_url);
    } catch (uploadError) {
      return {
        message: 'Image upload failed. Please try again.',
      };
    }
  }
  console.log(imageUrl)
  try {
    await sql`
      INSERT INTO customers (name, email, image_url)
      VALUES (${name}, ${email}, ${imageUrl})
    `;
  } catch (error) {
    console.error("Database Insert Error:", error);
    return {
      message: 'Database Error: Failed to Create Customer.',
    };
  }

  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

// Helper function to handle the image upload
async function uploadImageToStorage(file : File) {
  const imageUrl = '/customers/' + file.name;
  return imageUrl;
}