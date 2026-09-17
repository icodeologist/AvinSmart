package models

type Category struct {
	ID        uint   `gorm:"primaryKey;column:id" json:"id"`
	Name      string `gorm:"column:name;type:varchar(120);not null;uniqueIndex" json:"name"`
	CreatedAt int64  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Category) TableName() string {
	return "categories"
}

type SubCategory struct {
	ID uint `gorm:"primaryKey;column:id" json:"id"`
}
