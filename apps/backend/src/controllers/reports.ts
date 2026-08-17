import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import exceljs from 'exceljs';
import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns';

export const exportTimesheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startMonth, endMonth } = req.query; // format YYYY-MM
    
    if (!startMonth || !endMonth || typeof startMonth !== 'string' || typeof endMonth !== 'string') {
      res.status(400).json({ error: 'Missing or invalid startMonth/endMonth (YYYY-MM)' });
      return;
    }

    const startDate = startOfMonth(parseISO(`${startMonth}-01`));
    const endDate = endOfMonth(parseISO(`${endMonth}-01`));

    const workbook = new exceljs.Workbook();
    workbook.creator = 'FanE System';
    workbook.created = new Date();

    // ---------------------------------------------------------
    // SHEET 1: Danh mục campaign
    // ---------------------------------------------------------
    const sheet1 = workbook.addWorksheet('Danh mục campaign');
    sheet1.columns = [
      { header: 'MÃ DỰ ÁN', key: 'projectCode', width: 25 },
      { header: 'TÊN CAMP', key: 'name', width: 40 },
      { header: 'TÊN KHÁCH HÀNG', key: 'clientName', width: 30 },
      { header: 'TÌNH TRẠNG', key: 'status', width: 20 },
      { header: 'THỜI GIAN BẮT ĐẦU', key: 'startDate', width: 20 },
      { header: 'THỜI GIAN KẾT THÚC', key: 'endDate', width: 20 },
    ];

    const projects = await prisma.project.findMany({
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    });

    projects.forEach(p => {
      sheet1.addRow({
        projectCode: p.projectCode,
        name: p.name,
        clientName: p.client.legalName || p.client.name,
        status: p.status,
        startDate: format(p.startDate, 'dd/MM/yyyy'),
        endDate: p.endDate ? format(p.endDate, 'dd/MM/yyyy') : '',
      });
    });

    sheet1.getRow(1).font = { bold: true };
    sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };


    // ---------------------------------------------------------
    // SHEET 2: Personal time sheet
    // ---------------------------------------------------------
    const sheet2 = workbook.addWorksheet('Personal time sheet');
    sheet2.columns = [
      { header: 'THÁNG', key: 'month', width: 15 },
      { header: 'MÃ NHÂN VIÊN', key: 'staffId', width: 15 },
      { header: 'HỌ VÀ TÊN', key: 'fullName', width: 30 },
      { header: 'MÃ DỰ ÁN', key: 'projectCode', width: 25 },
      { header: 'THỜI GIAN (%)', key: 'percentage', width: 15 },
    ];

    const timesheets = await prisma.timesheet.findMany({
      where: {
        logDate: { gte: startDate, lte: endDate },
        approvalStatus: 'Approved'
      },
      include: {
        staff: true,
        task: { select: { projectCode: true } }
      }
    });

    type MonthlyStaffData = {
      totalHours: number;
      projects: Record<string, number>;
      staffInfo: { staffId: string; fullName: string };
    };
    const groupedData: Record<string, Record<string, MonthlyStaffData>> = {};

    timesheets.forEach(ts => {
      const monthStr = format(ts.logDate, 'yyyy-MM');
      const staffId = ts.staffId;
      const projectCode = ts.task.projectCode;

      if (!groupedData[monthStr]) groupedData[monthStr] = {};
      if (!groupedData[monthStr][staffId]) {
        groupedData[monthStr][staffId] = {
          totalHours: 0,
          projects: {},
          staffInfo: { staffId, fullName: ts.staff.fullName }
        };
      }

      groupedData[monthStr][staffId].totalHours += ts.hoursLogged;
      
      if (!groupedData[monthStr][staffId].projects[projectCode]) {
        groupedData[monthStr][staffId].projects[projectCode] = 0;
      }
      groupedData[monthStr][staffId].projects[projectCode] += ts.hoursLogged;
    });

    const sortedMonths = Object.keys(groupedData).sort();

    sortedMonths.forEach(monthStr => {
      const staffData = groupedData[monthStr];
      const sortedStaffIds = Object.keys(staffData).sort();

      sortedStaffIds.forEach(staffId => {
        const data = staffData[staffId];
        if (data.totalHours <= 0) return;

        const sortedProjects = Object.keys(data.projects).sort();
        
        sortedProjects.forEach(projectCode => {
          const projHours = data.projects[projectCode];
          const percentage = projHours / data.totalHours;

          sheet2.addRow({
            month: monthStr,
            staffId: data.staffInfo.staffId,
            fullName: data.staffInfo.fullName,
            projectCode: projectCode,
            percentage: percentage,
          });
        });
      });
    });

    sheet2.getRow(1).font = { bold: true };
    sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    sheet2.getColumn('percentage').numFmt = '0.00%';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=FanE_Timesheet_Report.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('[Export Timesheet Error]', error);
    res.status(500).json({ error: 'Lỗi khi tạo báo cáo Excel' });
  }
};
