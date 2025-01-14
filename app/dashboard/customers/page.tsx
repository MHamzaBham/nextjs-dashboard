import { fetchCustomers, fetchFilteredCustomers, fetchInvoicesPages } from "@/app/lib/data"
import CustomersTable from "@/app/ui/customers/table"
import Pagination from "@/app/ui/invoices/pagination";
import { CreateInvoice } from "@/app/ui/invoices/buttons";

export default async function Page(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const totalPages = await fetchInvoicesPages(query)
  return (
    <>
      <CustomersTable query={query} currentPage={currentPage}/>
      <div className="mt-5 flex w-full justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </>
  )
}